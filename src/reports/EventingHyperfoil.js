import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsonpath from 'jsonpath';
import { DateTime, Duration } from 'luxon'
import * as qs from 'query-string';
import { useHistory, useParams, useLocation } from "react-router"
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
import { Helmet } from "react-helmet";
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';
import reducer, { apply } from '../domain/reducer';
import { getCdf, getBuckets, getStats } from '../domain/stats';
import {PrometheusChart} from '../domain/prometheus';
import * as Charts from '../domain/charts';
import { fetchSearch } from '../redux/actions';

import ChartContainer from '../components/ChartContainer';
import OverloadTooltip from '../components/OverloadTooltip';
import theme, { chartColors, chartColorNames } from '../theme';

import {Table} from '../domain/charts';
import {HyperfoilCharts} from '../domain/hyperfoil'

const getDataName = (v, i, a) => {
    return a[i].name
}

const getTestCase = (datum)=>datum.data.qdup.run.state.testcase
const getId = (datum)=>getTestCase(datum)+" "+datum.data.qdup.run.state["mwperf-server01.perf.lab.eng.rdu2.redhat.com"].runId
const getHyperfoilId = (datum)=>datum.data.qdup.run.state["mwperf-server01.perf.lab.eng.rdu2.redhat.com"].runId
const getRunId = (datum)=>datum.data.qdup.run.state.JENKINS_ID
const useZoom = () => {
    const [left, setLeft] = useState(false)
    const [right, setRight] = useState(false)
    return {
        left,
        right,
        setLeft,
        setRight,
    };
}

const selectors = [
    { id: '99.0', name: (v, i, a, x) => `${v.name}_99.0`, accessor: `$.percentileResponseTime["99.0"]` },
    {
        id: 'rps', name: (v, i, a, x) => `${v.name}_rps`, accessor: (v) => {
            const denom = ((v.endTime - v.startTime) / 1000)
            const rtrn =  (v.requestCount / denom)
            return v.requestCount
        },
        axis: 'right'
    }
]

function EventingHyperfoil(){
    //const location = useLocation();
    const location = {search:""}//useLocation();
    const [data, setData] = useState([])
    const dataNames = useMemo(()=>data.map(getDataName),[data])

    const phases = useMemo(()=>[...new Set(data.length == 0 ? [] : data.flatMap(v=>v.data.hf.stats.map(s=>s.phase)))],[data])
    const forks = useMemo(()=>[...new Set(data.length == 0 ? [] : data.flatMap(v=>v.data.hf.stats.map(s=>s.fork)))],[data])
    const metrics = useMemo(()=>[...new Set(data.length == 0 ? [] : data.flatMap(v=>v.data.hf.stats.map(s=>s.metric)))],[data])

    const [currentDomain, setDomain] = useState(['auto','auto']);

    useEffect(
        fetchSearch("eventingHyperfoil", location.search, setData)
        , [location.search, setData])

    // useEffect(
    //     ()=>setDomain(fullDomain),[setDomain,fullDomain]
    // )
    

    return (
        <div className="pf-c-content">
            <div className="pf-c-card">
                <div className="pf-c-card__body">
                    <h1>eventing-hyperfoil-benchmark</h1>
                    <h3>Run Info</h3>
                    <Table
                        data={data}
                        layout="rows"
                        header="run id"
                        selectors={[
                            {header: 'testcase', accessor: getTestCase},
                            // {header: 'run id', accessor: getRunId},
                            {header: 'hyperfoil id', accessor: getHyperfoilId},
                            {header: 'duration', accessor: (v)=>(DateTime.fromMillis(v.data.hf.info.terminateTime).diff(DateTime.fromMillis(v.data.hf.info.startTime)).toFormat("hh:mm:ss"))},
                            {header: 'steps', accessor: (v)=>([...new Set([])]).length},
                            {header: 'errors', accessor: (v)=>v.data.hf.info.errors.length},
                            {header: 'failures', accessor: (v)=>v.data.hf.failures.length}
                        ]}
                    />
                    <PrometheusChart 
                        data={data}
                        search=""
                        target="pod"
                        stat="cpu"
                        title='all pods Σ(cpu)'
                        rightLabel=" "
                        domain={currentDomain}
                        getStart={(v)=>{
                            const rtrn = v.data.hf.info.startTime
                            return rtrn
                        }}
                        setDomain={setDomain}
                    />
                    <PrometheusChart
                        data={data}
                        search={(v)=>v.namespace == 'perf-test-eventing'}
                        target="namespace"
                        stat="cpu"
                        title={'perf-test-eventing namespace Σ(cpu)'}
                        rightLabel=" "
                        domain={currentDomain}
                        getStart={(v)=>{
                            const rtrn = v.data.hf.info.startTime
                            return rtrn
                        }}
                        setDomain={setDomain}
                    />
                    <PrometheusChart
                        data={data}
                        search={(v)=>v.namespace == 'kafka'}
                        target="namespace"
                        stat="cpu"
                        title={'kafka namespace Σ(cpu)'}
                        rightLabel=" "
                        domain={currentDomain}
                        getStart={(v)=>{
                            const rtrn = v.data.hf.info.startTime
                            return rtrn
                        }}
                        setDomain={setDomain}
                    />                    
                    <PrometheusChart 
                        data={data}
                        search="receiver"
                        target="pod"
                        stat="cpu"
                        title='receiver pod cpu'
                        rightLabel=" "
                        domain={currentDomain}
                        filterMethod="startsWith"
                        getStart={(v)=>{
                            const rtrn = v.data.hf.info.startTime
                            return rtrn
                        }}
                        setDomain={setDomain}
                    />
                    <HyperfoilCharts
                        title="99ᵗʰ percentile"
                        data={data}
                        selectors={selectors}
                        domain={currentDomain}
                        setDomain={setDomain}
                    />
                </div>
            </div>
        </div>
    )
}

export default EventingHyperfoil;