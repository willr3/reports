import React, { useEffect, useMemo } from 'react';
import {
    Area,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
    ResponsiveContainer,
} from 'recharts';
import jsonpath from 'jsonpath';
import { Duration } from 'luxon'

import theme, {
    chartColorNames
} from '../theme';

import reducer, { apply } from '../domain/reducer';
import { useZoom } from './charts';

import ChartContainer from '../components/ChartContainer';

const defaultGetDataNameFactory = (data)=> (v, i, a) => {
    return data[i].name
}

export const getForks = (data)=>{
    if( !data || data.length== 0){
        return []
    }
    
    const rtrn = data.flatMap(v=>{
        return v.data.hf.stats.map(s=>(s.fork))
    })
    return [...new Set(rtrn)]
}

export const hyperfoilDetailsSelectors = [
    { id: '99.9', name: (v, i, a, x) => `${v.name}_99.9`, accessor: `$.percentileResponseTime["99.9"]` },
    { id: '99.0', name: (v, i, a, x) => `${v.name}_99.0`, accessor: `$.percentileResponseTime["99.0"]` },
    { id: '90.0', name: (v, i, a, x) => `${v.name}_90.0`, accessor: `$.percentileResponseTime["90.0"]` },
    { id: '50.0', name: (v, i, a, x) => `${v.name}_50.0`, accessor: `$.percentileResponseTime["50.0"]` },
    {
        id: 'Mean',
        name: (v, i, a, x, y) => {
            return `${v.name}_Mean`
        },
        accessor: `$.meanResponseTime`

    },
    {
        id: 'rps', name: (v, i, a, x) => `${v.name}_rps`, accessor: (v) => {
            return (v.requestCount / ((v.endTime - v.startTime) / 1000))
        },
        axis: 'right'
    }
]

const OverloadTooltip = ({extra=[],data=[],dataNames=[],colors={},active,payload,label,...props})=>{
    if (!payload || !active || payload.length == 0) {
        return <></>
    }

    const payloadUnits = payload.reduce((rtrn,entry,entryIdx)=>{
        const name = entry.dataKey.substring(entry.dataKey.indexOf('-'))
        rtrn[name]=entry.unit
        return rtrn
    },{})
    if(active && payload[0]){
        const domainValue = payload[0].payload.__domainValue
        const idx = iterativeFunction(data,domainValue)
        const payloadDataKeys = payload.map(v=>v.dataKey.substring(v.dataKey.indexOf('-')))
        const missingDataNames = dataNames.filter(v=>!payload[0].dataKey.startsWith(v))
        

        const also = missingDataNames.reduce((rtrn,name)=>{
            payloadDataKeys.forEach((dataKey,dataKeyIdx)=>{
                let prevIdx = idx;
                let nextIdx = idx;
                while(data[prevIdx] && !data[prevIdx].hasOwnProperty(name+dataKey) && prevIdx>=0){
                    prevIdx--;
                }
                while(data[nextIdx] && !data[nextIdx].hasOwnProperty(name+dataKey) && nextIdx<data.length){
                    nextIdx++;
                }
                if(prevIdx<0){
                    if(nextIdx < data.length){

                    }
                }else if (nextIdx == data.length){

                }else{
                    const prevDomain = data[prevIdx].__domainValue;
                    const prevValue = data[prevIdx][name+dataKey]
                    const nextDomain = data[nextIdx].__domainValue;
                    const nextValue = data[nextIdx][name+dataKey]

                    const slope = (nextValue-prevValue)/(nextDomain-prevDomain)
                    const estimate = prevValue+slope*(domainValue-prevDomain)
                    const section = dataKey.substring(dataKey.lastIndexOf('_')+1)
                    const payloadNewName = name+"-"+section;
                    const color = colors[name+dataKey]
                    rtrn[name+dataKey]=estimate
                    payload.push({
                        color: color,
                        stroke: color,
                        cursor: "pointer",
                        dataKey: name+dataKey,
                        fillOpactiy: 0.6,
                        name: payloadNewName,
                        value: estimate,
                        unit: payloadUnits[dataKey],
                        estimated: true,
                    })
                    }
            })
            return rtrn;
        },{})

        extra.forEach(toAdd=>{
            if(typeof toAdd === "function"){
                payload.push(toAdd(payload[0].payload))
            }
        })
    }
    if(active && payload && payload.length){
        payload.sort((a,b)=>a.name.localeCompare(b.name))
        return (
            <div style={{backgroundColor: 'white', margin: '0px', padding: '10px', border: '1px solid rgb(204, 204, 204)', whiteSpace: 'nowrap'}}>
                <p style={{margin: '0px'}}>{props.labelFormatter(label)}</p>
                <ul style={{padding: '0px', margin: '0px'}}>
                {payload.map((entry,entryIdx)=>(
                    <li style={{display: 'block', paddingTop: '4px', paddingBottom: '4px', color: entry.color}} key={entryIdx}>{entry.name} : {entry.estimated ? "~":""}{entry.unit==="ns" ? Number(entry.value/1000000.0).toFixed(3) : entry.value}{entry.unit==="ns" ? "ms":entry.unit}</li>))}
                </ul>
            </div>
        )
    }else{
        return null
    }
}

const iterativeFunction = function (arr, x) {
  
    let start=0, end=arr.length-1;
         
    // Iterate while start not meets end
    while (start<=end){
 
        // Find the mid index
        let mid=Math.floor((start + end)/2);
        // If element is present at mid, return True
        if (arr[mid].__domainValue===x) return mid;
 
        // Else look in left or right half accordingly
        else if (arr[mid].__domainValue < x)
             start = mid + 1;
        else
             end = mid - 1;
    }
    return false;
}

export const HyperfoilCharts = ({
    data=[],
    phases=[],
    forks=[],
    metrics=[],
    selectors=[
        { id: '99.0', name: (v, i, a, x) => `${v.name}_99.0`, accessor: `$.percentileResponseTime["99.0"]` },
        {
            id: 'rps', name: (v, i, a, x) => `${v.name}_rps`, accessor: (v) => {
                const denom = ((v.endTime - v.startTime) / 1000)
                const rtrn =  (v.requestCount / denom)
                return v.requestCount
            },
            axis: 'right'
        }
    ],
    title="",
    domain=['auto','auto'], 
    setDomain=false,
    hyperfoilPath="$.data.hf",
    formatter=(v)=>v,
    tickFormatter=(v)=>v, 
    labelFormatter=(v) => Duration(v).toFormat("hh:mm"),
    getName = (datum, datumIndex, datasets) => datum.name,
    ...rest
})=>{
    const zoom = useZoom();

    const dataNames = useMemo(()=>data.map(getName),[data,getName])
    const _phases = useMemo(()=>[...new Set(
        data.length === 0 ? [] :
        data.flatMap(v=>
            (jsonpath.value(v,`${hyperfoilPath}.stats`)||[])
                .map(s=>s.phase))        
    )],[phases,data])
    const _forks = useMemo(()=>[...new Set(
        data.length === 0 ? [] :
        data.flatMap(v=>
            (jsonpath.value(v,`${hyperfoilPath}.stats`)||[])
                .map(s=>s.fork))
    )],[forks,data])
    const _metrics = useMemo(()=>[...new Set(
        data.length === 0 ? [] :
        data.flatMap(v=>
            (jsonpath.value(v,`${hyperfoilPath}.stats`)||[])
                .map(s=>s.metric))        
    )],[metrics,data])

    const leftIds = useMemo(()=>selectors.filter(v => !v.hasOwnProperty("axis") || v.axis !== "right").map(s => s.id),[selectors])
    const rightIds = useMemo(()=>selectors.filter(v => v.hasOwnProperty("axis") && v.axis == "right").map(s => s.id),[selectors])

    const chartData = useMemo(()=>{
        const rtrn = reducer(
            data,
            selectors,
            {
                getName: getName,
                getSeries: (d, i, a) => {
                    const found = (jsonpath.query(d, `${hyperfoilPath}.stats[*]`)||[]).flatMap((stat,statIndex)=>{
                        return (stat.series || []).map((series, seriesIndex) => ({
                            ...series,
                            name: stat.total.phase + "_" + stat.total.metric
                        }))
                    })
                    return found
                },
                getDomain: [
                    (entry,index,all,datum)=>{
                        const rtrn = entry.startTime - (jsonpath.value(datum,`${hyperfoilPath}.info.startTime`)||0)
                        return rtrn;
                    }, (entry,index,all,datum)=>{
                        return entry.endTime - (jsonpath.value(datum,`${hyperfoilPath}.info.startTime`)||0)
                    }
                ]
            }
        )
        return rtrn;
    },[data,selectors])

    const fullDomain = useMemo(()=>{
        if(chartData.length == 0){
            return ['auto','auto']
        }else{
            return [chartData[0].__domainValue,chartData[chartData.length-1].__domainValue]
        }
    },[chartData])

    useEffect(
        ()=>{
            if(fullDomain[0] != domain[0] || fullDomain[1] != domain[1]){
                setDomain(fullDomain)
            }
        },[fullDomain,setDomain]
    )

    if(data.length === 0){
        return <></>
    }else if(chartData.length === 0){
        return <div>Missing data for Hyperfoil @ {hyperfoilPath}</div>
    }else{
        return _forks.map((forkName, forkIndex) =>{
            const forkMetrics = [...new Set(data.length == 0 ? [] : data.flatMap(datum=>datum.data.hf.stats.filter(v => v.fork === forkName).map(v => (v.metric))))]
            return _metrics.flatMap((metricName,metricIndex)=>{
                const phaseNames = data.length == 0 ? [] : [...new Set(data.flatMap(datum=>datum.data.hf.stats.filter(v=>v.fork == forkName && v.metric == metricName).map(v=> v.total.phase)))]
                const tipColors = {}
                return (
                    <React.Fragment key={`${forkName}.${metricName}`}>
                        <h2>{`${forkName} ${metricName}`}</h2>
                        <ChartContainer
                            title={`${metricName} ${title}`}
                            leftLabel="ms"
                            rightLabel="requests per second"
                            labels={
                                _phases.reduce((rtrn,phase, phaseIndex)=>{
                                    rtrn[phase] = theme.colors.chart[chartColorNames[phaseIndex % chartColorNames.length]][0]
                                    return rtrn;
                                },{})
                            }
                            onDoubleClick={ e=> {
                                if(setDomain && fullDomain){
                                    setDomain(fullDomain)
                                }
                            }}
                        >
                            <ResponsiveContainer width="100%" height={360}>
                                <ComposedChart
                                    data={chartData}
                                    style={{userSelect: 'none'}}
                                    onMouseDown={e => {
                                        if (e) {
                                            zoom.setLeft(e.activeLabel);
                                            zoom.setRight(e.activeLabel)
    
                                            if (e.stopPropagation) e.stopPropagation();
                                            if (e.preventDefault) e.preventDefault();
                                            e.cancelBubble = true;
                                            e.returnValue = false;
                                            return false;
                                        }
                                        return false;
                                    }}
                                    onMouseMove={e => {
                                        if (zoom.left) {
                                            const r = e.activeLabel ?
                                                e.activeLabel :
                                                zoom.right > zoom.left ?
                                                    domain[1] :
                                                    domain[0]
                                            zoom.setRight(r)
                                        }
                                        return false;
                                    }}
                                    onMouseUp={e => {
                                        if (zoom.left && zoom.right && zoom.left !== zoom.right) {
                                            let newDomain = [zoom.left, zoom.right];
                                            if (zoom.left > zoom.right) {
                                                newDomain = [zoom.right, zoom.left];
                                            }
                                            setDomain(newDomain);
                                        }
                                        zoom.setLeft(false);
                                        zoom.setRight(false)
                                    }}                                    
                                >
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis
                                        allowDataOverflow={true}
                                        type="number"
                                        scale="time"
                                        dataKey="__domainValue"
                                        //domain={['auto', 'auto']}
                                        domain={domain}
                                        tickFormatter={(v) => Duration.fromMillis(v).toFormat("hh:mm:ss")}
                                    />
                                    <YAxis
                                        yAxisId={0}
                                        orientation="left"
                                        tickFormatter={(v)=> Number(v/1000000).toFixed(0)}
                                        allowDataOverflow={true}
                                        domain={['auto', 'auto']}
                                    />
                                    {rightIds.length > 0 ? (<YAxis
                                        yAxisId={1}
                                        orientation="right"
                                        allowDataOverflow={true}
                                        domain={['auto', 'auto']}
                                    ></YAxis>) : null}
                                    {
                                        _phases.flatMap((phase,phaseIndex)=>{
                                            const pallet = theme.colors.chart[chartColorNames[phaseIndex % chartColorNames.length]]
                                            return phaseNames
                                                .filter(phaseName=>phaseName.startsWith(phase))
                                                .flatMap((phaseName,phaseNameIndex)=>{
                                                    return data.flatMap((datum,datumIndex)=>{
                                                        const dataName = getName(datum,datumIndex,data)
                                                        const rtrn = leftIds.map((selectorName,selectorIndex)=>{
                                                            const dataKey=`${dataName}-${phaseName}_${metricName}_${selectorName}`
                                                            const color = pallet[datumIndex % pallet.length]
                                                            tipColors[dataKey]=color
                                                            return (
                                                                <Area
                                                                    key={dataKey}
                                                                    onClick={(e)=>{}}
                                                                    dataKey={dataKey}
                                                                    name={`${dataName}-${selectorName}`}
                                                                    yAxisId={0}
                                                                    unit="ns"
                                                                    stroke={color}
                                                                    fill={color}
                                                                    cursor={"pointer"}
                                                                    connectNulls={true}
                                                                    type="monotone"
                                                                    dot={false}
                                                                    isAnimationActive={false}                                                    
                                                                    style={{ strokeWidth: 1 }}
                                                                />
                                                            )
                                                        })
                                                        rightIds.map((selectorName,selectorIndex)=>{
                                                            const dataKey=`${dataName}-${phaseName}_${metricName}_${selectorName}`
                                                            const color = theme.colors.chart.orange[datumIndex % theme.colors.chart.orange.length]
                                                            tipColors[dataKey]=color
                                                            return (<Line
                                                            key={`${dataKey}`}
                                                            dataKey={`${dataKey}`}
                                                            name={`${dataName}-${selectorName}`}
                                                            yAxisId={1}
                                                            stroke={color}
                                                            fill={color}
                                                            connectNulls={true}
                                                            dot={false}
                                                            isAnimationActive={false}
                                                            style={{ strokeWidth: 2 }}
                                                        />)
                                                        }).forEach(e=>rtrn.push(e))
                                                        return rtrn;                                                        
                                                    })
                                                })
                                        })
                                    }
                                    <Tooltip
                                        formatter={(e) => Number(e).toFixed(0)}
                                        labelFormatter={(v) => Duration.fromMillis(v).toFormat("hh:mm:ss")}
                                        content={
                                            <OverloadTooltip
                                                data={chartData}
                                                dataNames={dataNames}
                                                active={true}
                                                colors={tipColors}
                                                extra={[]}
                                            />
                                        }
                                    />
                                    {setDomain && zoom.left && zoom.right ?
                                        (<ReferenceArea yAxisId={0} x1={zoom.left} x2={zoom.right} strokeOpacity={0.3} />)
                                        : undefined
                                    }                                    

                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </React.Fragment>
                )
            })
        })

        
    }
}