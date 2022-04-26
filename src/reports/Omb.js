import React, { useState, useEffect, useMemo } from 'react';
import jsonpath from 'jsonpath';
import { DateTime,Duration } from 'luxon'
import { Helmet } from "react-helmet";
import { useLocation } from "react-router"
//import { Helmet } from "react-helmet";
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';
import {
    Area,
    Bar,
    Label,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';
import {PrometheusChart} from '../domain/prometheus';
import { fetchSearch } from '../redux/actions';

import {HyperfoilCharts} from '../domain/hyperfoil'

import ChartContainer from '../components/ChartContainer';
import theme, { chartColors, chartColorList, chartColorNames } from '../theme';
import {Table} from '../domain/charts';
import reducer from '../domain/reducer';
import { ZoomChart } from '../domain/charts';


const getDataOffset = (datum,index,dataset)=>{
    const runStart = jsonpath.value(datum,'$.data.qdup.run.timestamps.start')
    const samplingStart = jsonpath.value(datum,'$.data.qdup.run.latches.omb_benchmarking')
    return samplingStart - runStart;
}
const getDataName = (v, i, a) => {
    return a[i].name
}
/*
        endToEndLatency
        publishLatency
*/
const OmbQuantSeriesChart = ({leftLabel="",category="endToEndLatency",title="",data=[],getName=getDataName,domain=['auto','auto'],setDomain=(v)=>v,children,getOffset=(v)=>0})=>{
    const keys = [
        "50pct",
        "75pct",
        "95pct",
        "99pct",
        "9999pct",
        // "Avg",
        // "Max"
    ];
    
    const keyMap = {}
    keys.forEach(key=>keyMap[key]=key)
    const reduced = useMemo(()=>{
        return reducer(
            data,
            keyMap,
            {
                getName,
                getSeries: (d,di,da)=>{
                    const rtrn = {}
                    keys.forEach((key)=>{
                        const toFind = `$.data.omb.${category}${key}`
                        const found = jsonpath.value(d,toFind)
                        if(found){
                            found.forEach((v,i,a)=>{
                                const ts = (i+1)*10_000+getOffset(d,di,da)
                                if(!rtrn[ts]){
                                    rtrn[ts]={ts}
                                }
                                rtrn[ts][key]=v
                            })
                        }
                    })
                    return Object.values(rtrn)
                },
                getDomain:(v)=>v.ts
            }
        )
    },[data,getOffset])
    return (
        <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <ZoomChart
                data={reduced}
                title={title}
                leftLabel={"response time (ms)"}
                rightLabel=" "
                domainLabel="elapsed time"
                domain={domain}
                setDomain={setDomain}
                tooltipFomratter={v=>Number(v).toFixed(3)}
                tickFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                labelFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                //getName
                labels={data.map(getName).reduce((rtrn,entry,index,all)=>{
                    rtrn[entry]=theme.colors.chart[chartColorNames[index]][0]
                    return rtrn;
                },{})}
            >
                {data.flatMap((datum,datumIndex,datasets)=>{
                    const datumName = getName(datum,datumIndex,datasets)                            
                    const colorName = chartColorNames[datumIndex]
                    return keys.map((key,keyIndex)=>{
                        const color = theme.colors.chart[colorName][keyIndex]
                        return (
                            <Area
                                key={`${datumName}-${key}`}
                                yAxisId={0}
                                name={`${datumName}-${key}`}
                                dataKey={`${datumName}-${key}`}
                                stroke={color}
                                fill={color}
                                connectNulls={true}
                                dot={false}
                                isAnimationActive={false}
                                style={{ strokeWidth: 2 }}
                                fillOpacity={0.5}
                            />
                        )
                    })

                })}
                {children}
            </ZoomChart>
        </div>
    )
}
const OmbSeriesChart = ({leftLabel="",title="",path="",children=[],data=[],getName=getDataName,domain=[],setDomain=(v)=>v,getOffset=(v)=>0})=>{
    const reduced = useMemo(()=>{
        return reducer(
            data,
            {
                v: "v"
            },
            {
                getName,
                getSeries: (d,di,da)=>{
                    const found = jsonpath.value(d,path)
                    return found ? found.map((v,i,a)=>{
                        return {
                            ts: (i+1)*10_000+getOffset(d,di,da),
                            v: v
                        }
                    }): []
                },
                getDomain:(v)=>v.ts
            }
        )
    },[data,path,getOffset])
    return (
        <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <ZoomChart
                data={reduced}
                title={title}
                leftLabel={leftLabel}
                rightLabel=" "
                domainLabel="elapsed time"
                domain={domain}
                setDomain={setDomain}
                tooltipFomratter={v=>Number(v).toFixed(3)}
                tickFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                labelFormatter={v=>Duration.fromMillis(v).toFormat("hh:mm:ss")}
                //getName
                labels={data.map(getName).reduce((rtrn,entry,index,all)=>{
                    rtrn[entry]=chartColorList[index]
                    return rtrn;
                },{})}
            >
                {data.map((datum,datumIndex,datasets)=>{
                    const datumName = getName(datum,datumIndex,datasets)                            
                    const key = `${datumName}-v`
                    const color = chartColorList[datumIndex]
                    return (
                        <Line
                            key={key}
                            yAxisId={0}
                            name={`${datumName}`}
                            dataKey={key}
                            stroke={color}
                            fill={color}
                            connectNulls={true}
                            dot={false}
                            isAnimationActive={false}
                            style={{ strokeWidth: 2 }}
                        />
                    )
                })}
                {children}
            </ZoomChart>
        </div>        
    )
}
const OmbQuantChart = ({title="",data=[],path="",getName=getDataName,children=[],domain=['auto','auto'],setDomain=(v)=>v})=>{
    const reduced = useMemo(()=>{
        return reducer(
            data,
            {
                v: "v",
            },
            {
                getName,
                getSeries: (v,i,a)=>{
                    const found = jsonpath.value(v,path)
                    return Object.keys(found).map(k=>({p: parseFloat(k), v: found[k]}))
                },
                getDomain:(v)=>v.p
            }
        )
    },[data,path])

    return (
        <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <ZoomChart
                data={reduced}
                title={title}
                leftLabel="response time (ms)"
                rightLabel=" "
                domainLabel="percentile"
                domain={domain}
                setDomain={setDomain}
                tooltipFomratter={v=>Number(v).toFixed(3)}
                tickFormatter={v=>Number(v).toFixed(3)}
                labelFormatter={v=>Number(v).toFixed(3)}
                //getName
                labels={data.map(getName).reduce((rtrn,entry,index,all)=>{
                    rtrn[entry]=chartColorList[index]
                    return rtrn;
                },{})}
            >
                {data.map((datum,datumIndex,datasets)=>{
                    const datumName = getName(datum,datumIndex,datasets)                            
                    const key = `${datumName}-v`
                    const color = chartColorList[datumIndex]
                    return (
                        <Line
                            key={key}
                            yAxisId={0}
                            name={`${datumName}`}
                            dataKey={key}
                            stroke={color}
                            fill={color}
                            connectNulls={true}
                            dot={false}
                            isAnimationActive={false}
                            style={{ strokeWidth: 2 }}
                        />
                    )
                })}
                {children}
            </ZoomChart>
        </div>
    )

}
function Omb(){

    const location = useLocation();
    const [data, setData] = useState([])
    const dataNames = useMemo(()=>data.map(getDataName),[data])
    const [seriesDomain, setSeriesDomain] = useState(['auto','auto']);
    const [distributionDomain, setDistributionDomain] = useState(['auto','auto'])
    
    /*
    distributions:
        aggregatedEndToEndLatencyQuantiles
        aggregatedPublishLatencyQuantiles
    
    series:
        backlog
        consumeRate
        endToEndLatency50pct
        endToEndLatency75pct
        endToEndLatency95pct
        endToEndLatency99pct
        endToEndLatency9999pct
        endToEndLatencyAvg
        endToEndLatencyMax
        publishLatency50pct
        publishLatency75pct
        publishLatency95pct
        publishLatency99pct
        publishLatency9999pct
        publishLatencyAvg
        publishLatencyMax
        publishRate
    
    */
    
    useEffect(
        fetchSearch("omb", location.search, setData)
        , [location.search, setData])
    return (
        <div className="pf-c-page">
        <div className="pf-c-page__main">
        <div className="pf-c-page__main-section">
        <div className="pf-c-content">
            <Helmet>
                <title>omb {data.map(v=>v.name).join(" ")}</title>
            </Helmet>
            <div className="pf-c-card">
                <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none' }}>
                        <Table
                            data={data}
                            header="Settings"
                            selectors={
                                [
                                    {
                                        header: 'driver',
                                        accessor: (v,i,a)=> jsonpath.value(v,"$.data.qdup.run.state.driver")
                                    },
                                    {
                                        header: 'workload',
                                        accessor: (v,i,a)=> jsonpath.value(v,"$.data.qdup.run.state.workload")
                                    }
                                ]
                            }
                        />
                </div>
            </div>
            <div className="pf-c-card">
                <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <PrometheusChart 
                        data={data}
                        search=""
                        target="pod"
                        stat="cpu"
                        title='all pods Σ(cpu)'
                        rightLabel=" "
                        domain={seriesDomain}
                        getStart={(v)=>{
                            const rtrn = v.data.qdup.run.timestamps.start
                            return rtrn
                        }}
                        setDomain={setSeriesDomain}
                    >
                        {/* <ReferenceLine
                            x={60_000*12}
                            label="fooo"
                            stroke="grey"
                            
                        /> */}
                    </PrometheusChart>
                </div>
            </div>
            <div className="pf-c-card">
                <OmbQuantSeriesChart
                    title="end to end latency"
                    category="endToEndLatency"
                    data={data}
                    domain={seriesDomain}
                    setDomain={setSeriesDomain}
                    getOffset={getDataOffset}                    
                />
            </div>
            <div className="pf-c-card">
                <OmbQuantSeriesChart
                    title="publish latency"
                    category="publishLatency"
                    data={data}
                    domain={seriesDomain}
                    setDomain={setSeriesDomain}
                    getOffset={getDataOffset}                    
                />                
                <OmbQuantChart
                    data={data}
                    path="$.data.omb.aggregatedPublishLatencyQuantiles"
                    title="publish distribution"
                    domain={distributionDomain}
                    setDomain={setDistributionDomain}
                />
                <OmbQuantChart
                    data={data}
                    path="$.data.omb.aggregatedEndToEndLatencyQuantiles"
                    title="end to end distribution"
                    domain={distributionDomain}
                    setDomain={setDistributionDomain}
                />
                <OmbSeriesChart
                    data={data}
                    path="$.data.omb.publishRate"
                    title="publish rate"
                    leftLabel="rate"
                    domain={seriesDomain}
                    setDomain={setSeriesDomain}
                    getOffset={getDataOffset}
                >
                </OmbSeriesChart>
                <OmbSeriesChart
                    data={data}
                    path="$.data.omb.consumeRate"
                    title="consume rate"
                    leftLabel="messages"
                    domain={seriesDomain}
                    setDomain={setSeriesDomain}
                    getOffset={getDataOffset}
                />
                <OmbSeriesChart
                    data={data}
                    path="$.data.omb.backlog"
                    title="backlog"
                    leftLabel="messages"
                    domain={seriesDomain}
                    setDomain={setSeriesDomain}
                    getOffset={getDataOffset}
                />
            </div>
        </div>
        </div>
        </div>
        </div>

    )
}

export default Omb;