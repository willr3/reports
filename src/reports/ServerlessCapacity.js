import React, { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon'
import { Helmet } from "react-helmet";
import { useLocation } from "react-router"
//import { Helmet } from "react-helmet";
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';
import {PrometheusChart} from '../domain/prometheus';
import { fetchSearch } from '../redux/actions';

import {Table} from '../domain/charts';
import {HyperfoilCharts} from '../domain/hyperfoil'

const getDataName = (v, i, a) => {
    return a[i].name
}



function ServerlessCapacity(){
    const location = useLocation();
    const [data, setData] = useState([])
    const dataNames = useMemo(()=>data.map(getDataName),[data])

    const [currentDomain, setDomain] = useState(['auto','auto']);

    useEffect(
        fetchSearch("serverlessCapacity", location.search, setData)
        , [location.search, setData])


    console.log({data})

    const getStart = (v)=>{
        const rtrn = v.data.qdup.run.timestamps.start
        const startKsvc = v.data.qdup.run.latches.startKsvc
        return rtrn
    }

    return (
        <div className="pf-c-content">
            <Helmet>
                <title>capacity {data.map(v=>v.file).join(" ")}</title>
            </Helmet>
            <div className="pf-c-card">
                <div className="pf-c-card__body">
                <PrometheusChart 
                    data={data}
                    search={(v)=>v.namespace == "knative-serving-ingress"}
                    target="pod"
                    stat="cpu"
                    title='knative-serving-ingress pods cpu'
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    setDomain={setDomain}
                />

                <PrometheusChart 
                    data={data}
                    search=""
                    target="pod"
                    stat="cpu"
                    title='all pods Σ(cpu)'
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    setDomain={setDomain}
                />
                <PrometheusChart 
                    data={data}
                    search={(v)=>v.namespace == "knative-serving-ingress"}
                    target="namespace"
                    stat="cpu"
                    title='knative-serving-ingress namespace Σ(cpu)'
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    setDomain={setDomain}
                />
                <PrometheusChart 
                    data={data}
                    search={(v)=>v.namespace == "knative-serving"}
                    target="namespace"
                    stat="cpu"
                    title='knative-serving namespace Σ(cpu)'
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    setDomain={setDomain}
                />
                <PrometheusChart 
                    data={data}
                    search={(v)=>v.namespace == "openshift-ovn-kubernetes"}
                    target="namespace"
                    stat="cpu"
                    title='openshift-ovn-kubernetes namespace Σ(cpu)'
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    setDomain={setDomain}
                />   
                <PrometheusChart
                    data={data}
                    search="ovnkube-master"
                    target="pod"
                    stat="cpu"
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    // title='ovnkube-master namespace Σ(cpu)'

                />
                <PrometheusChart
                    data={data}
                    search="ovnkube-node"
                    target="pod"
                    stat="cpu"
                    rightLabel=" "
                    domain={currentDomain}
                    getStart={getStart}
                    // title='ovnkube-master namespace Σ(cpu)'

                />
                </div>
            </div>
        </div>
    )
}

export default ServerlessCapacity;