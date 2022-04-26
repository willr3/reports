import React, { useMemo } from 'react';
import {
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
import theme, { chartColors, chartColorNames } from '../theme';
import reducer, { apply } from '../domain/reducer';
import { useZoom } from './charts';

import ChartContainer from '../components/ChartContainer';

export const getPrometheusCategorySum = (getCategory,stat="cpu" /*mem*/,cfg={}) => (datum, datumIndex, datasets) =>{
    const {
        getStart = (v)=>  Math.floor(jsonpath.value(v, "$.data.qdup.run.timestamps.start") / 1000),
        getStop = (v)=>  Math.floor(jsonpath.value(v, "$.data.qdup.run.timestamps.stop") / 1000),
    } = cfg
    const start = apply(getStart,datum,datumIndex,datasets);//Math.floor(jsonpath.value(datum, "$.data.qdup.run.timestamps.start") / 1000)
    const stop = apply(getStop,datum,datumIndex,datasets);//Math.floor(jsonpath.value(datum, "$.data.qdup.run.timestamps.stop") / 1000)
    //const stop = Math.floor(jsonpath.value(datum, "$.data.qdup.run.timestamps.start") / 1000) + 4.75*60*60
    const categories = {}
    const values = Object.values(
        jsonpath.value(datum, `$.data.oc.prometheus.${stat}`)
        .reduce((rtrn,entry,index, all)=>{
            const category = getCategory(entry.metric)
            if(!categories[category]){
                categories[category] = 0
            }
            entry.values.filter((v,i,a)=>{
                const ts = v[0]
                return ts > start && ts < stop
            }).forEach((v,i,a)=>{
                if (!rtrn["" + v[0]]) {
                    rtrn["" + v[0]] = {__domainValue: v[0] - start }
                }
                if( !rtrn["" + v[0]][category] ){
                    rtrn["" + v[0]][category] = 0
                }
                const val = parseFloat(v[1])
                rtrn["" + v[0]][category] += val
                categories[category] += val
            })
            return rtrn
        }, {})
    )
    return {categories,values}

}
export const getPrometheusSum = (filter, target = "pod" /*namespace*/, stat = "cpu" /*mem*/,cfg={}) => (datum, datumIndex, datasets) => {
    const {
        getStart = (v)=>  Math.floor(jsonpath.value(v, "$.data.qdup.run.timestamps.start")),
        getStop = (v)=>  Math.floor(jsonpath.value(v, "$.data.qdup.run.timestamps.stop")),
        prometheusPath = "$.data.oc.prometheus",
        filterMethod = "includes",//startsWith
    } = cfg
    const start = apply(getStart,datum,datumIndex,datasets);//Math.floor(jsonpath.value(datum, "$.data.qdup.run.timestamps.start") / 1000)
    const stop = apply(getStop,datum,datumIndex,datasets);//Math.floor(jsonpath.value(datum, "$.data.qdup.run.timestamps.stop") / 1000)
    const found = typeof filter === "function" ? 
        [...new Set( (jsonpath.value(datum, `${prometheusPath}.${stat}`)||[]).filter(v=>filter(v.metric)).map(v=>v.metric[target])) ] 
        : [...new Set(jsonpath.query(datum, `${prometheusPath}.${stat}[?(@.metric.${target}.${filterMethod}("${filter}") )].metric.${target}`))]
    const rtrn = Object.values(
            found
            .reduce((rtrn, entry, index, all) => {
                const values = jsonpath.query(datum, `${prometheusPath}.${stat}[?(@.metric.${target} == "${entry}" )].values`)
                values.forEach(value=>{
                    value.forEach((v, i, a) => {
                        if (!rtrn["" + v[0]]) {
                            rtrn["" + v[0]] = { __domainValue: v[0]*1000 - start, sum: 0 }
                        }
                        rtrn["" + v[0]].sum += parseFloat(v[1])
                    })
                })
                return rtrn
            }, {})
    )
    return rtrn
}

export const PrometheusChart = (props) => {
    const {
        data=[], 
        search="",
        target = "pod", 
        stat = "cpu", 
        title=`${target} ${search} Σ(${stat})`,
        leftLabel=`${stat}`, 
        rightLabel="",
        domainLabel="elapsed time",
        domain=['auto','auto'], 
        setDomain=false,
        formatter=(v)=>v,
        tickFormatter=(v)=>v, 
        labelFormatter=(v) => Duration(v).toFormat("hh:mm"),
        getName = (datum, datumIndex, datasets) => datum.name,
        children,
        ...rest
    } = props;
    const zoom = useZoom();
    const labels = data.reduce((rtrn, datum, datumIndex) => {
        rtrn[getName(datum, datumIndex, data)] = chartColors[datumIndex % chartColors.length]
        return rtrn;
    }, {})
    const chartData = useMemo(()=>reducer(
        data,
        {
            "oc": (v) => { return v.sum; }
        },
        {
            getName,
            getSeries: getPrometheusSum(search, target, stat, rest), //ovnkube-master
            getDomain: (v) => v.__domainValue
        }
    ),[data])

    const fullDomain = useMemo(()=>{
        if(chartData.length == 0){
            return ['auto','auto']
        }else{
            return [chartData[0].__domainValue,chartData[chartData.length-1].__domainValue]
        }
    },[chartData])


    if(data.length === 0){
        return <></>
    }else if(chartData.length === 0){
        return <div>Missing data for {title}</div>
    }else{
    return (
        <div style={{ pageBreakInside: 'avoid' }}>
            <ChartContainer
                title={title}
                leftLabel={leftLabel}
                rightLabel={rightLabel}
                domainLabel={domainLabel}
                labels={labels}
                onDoubleClick={ e=> {
                    if(setDomain && fullDomain){
                        setDomain(fullDomain)
                    }
                }}
            >
                <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart
                        data={chartData}
                        style={{ userSelect: 'none' }}
                        onMouseDown={e => {
                            if (setDomain && e) {
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
                            if (setDomain && zoom.left) {
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
                            if (setDomain && zoom.left && zoom.right && zoom.left !== zoom.right) {
                                let newDomain = [zoom.left, zoom.right];
                                if (zoom.left > zoom.right) {
                                    newDomain = [zoom.right, zoom.left];
                                }
                                setDomain(newDomain);
                            }
                            if(setDomain){
                                zoom.setLeft(false);
                                zoom.setRight(false)
                            }
                        }}                                    
        >
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip
                            formatter={formatter}
                            labelFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                        />
                        <XAxis
                            allowDataOverflow={true}
                            type="number"
                            scale="linear"
                            dataKey="__domainValue"
                            domain={domain}
                            //domain={['dataMin', 'auto']}
                            //domain={[11700,17160]}
                            tickFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                            tick={(props)=>{
                                const {x,y,width,height,stroke,fill,payload,...rest} = props;
                                if ( (!Number.isNaN(domain[1]) && payload.value > domain[1]) || (!Number.isNaN(domain[0]) && payload.value < domain[0]) ){
                                        return (
                                            <></>
                                        )        
                                }else{
                                    return (
                                        <text x={x} y={y} width={width} height={height} textAnchor="middle" stroke={stroke} fill={fill}>
                                            <tspan x={x} dy="0.71em">{Duration.fromMillis(payload.value).toFormat("hh:mm:ss")}</tspan>
                                        </text>
                                    )
                                }
                            }}
                        >
                            {/* <Label
                            value="services"
                            position="insideBottom"
                            angle={0}
                            offset={0}
                            textAnchor='middle'
                            style={{ textAnchor: 'middle' }}
                        /> */}
                        </XAxis>
                        {/* <Brush dataKey="__domainValue" height={30} stroke="#8884d8" /> */}
                        {/* <Legend align="left" /> */}
                        <YAxis
                            yAxisId={0}
                            allowDataOverflow={true}
                            domain={[0, 'auto']}
                            tickFormatter={tickFormatter}
                        >
                            {/* <Label value="seconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                        </YAxis>
                        { rightLabel ? <YAxis
                            yAxisId={1}
                            orientation="right"
                            allowDataOverflow={true}
                            domain={['auto','auto']}
                        ></YAxis> : null}
                        {data.map((datum, datumIndex, datasets) => (
                            <Line
                                key={`${datum.name}-oc`}
                                yAxisId={0}
                                name={`${datum.name}`}
                                dataKey={`${datum.name}-oc`}
                                stroke={theme.colors.chart[chartColorNames[datumIndex]][0]}
                                fill={theme.colors.chart[chartColorNames[datumIndex]][0]}
                                connectNulls={true}
                                dot={false}
                                isAnimationActive={false}
                                style={{ strokeWidth: 2 }}
                            />
                        ))}
                        {children}
                        {/* <ReferenceArea yAxisId={0} x1={11700} x2={17160} strokeOpacity={0.3} /> */}
                        {setDomain && zoom.left && zoom.right ?
                            (<ReferenceArea yAxisId={0} x1={zoom.left} x2={zoom.right} strokeOpacity={0.3} />)
                            : undefined
                        }
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    )
                    }
}
export default PrometheusChart;