import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet";
import jsonpath from 'jsonpath';
import { DateTime } from 'luxon'
import { useLocation } from "react-router"
import {
  Label,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';

import theme, {
  chartColorNames
} from '../theme';

import { fetchSearch } from '../redux/actions';
import ChartContainer from '../components/ChartContainer';
import {
  fabanDuration,
  xanDistributionChart,
  xanTimeChart,
  

} from '../domain/faban';
import {
  joinGc,
  gcCharts 
} from '../domain/gc';

const getId = (datum)=>datum.data.qdup.state["mwperf-server03.perf.lab.eng.rdu2.redhat.com"].RUNTIME_NAME+"_"+datum.name+"_"+jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`)

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

const percentDiff = (a, b, path) => {
  const v1 = (jsonpath.query(a, path) || [NaN])[0]
  const v2 = (jsonpath.query(b, path) || [NaN])[0]
  const rtrn = (v1 - v2) / ((v1 + v2) / 2) * 100
  return Number.isNaN(rtrn) ? "" : Number(rtrn).toFixed(3) + "%";
}
//const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0)
//const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")

const joinPmi = (data, seriesPath, entryPath) => {
  const rtrn = {}
  data.forEach((datum, datumIndex) => {
    const name = datum.name;
    const starting = (jsonpath.query(datum.data, `$.qdup.latches.SERVER_STARTING`) || [0])[0]

    const minTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_UP`) || [0])[0]
    const maxTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_DOWN`) || [0])[0] + 60 * 1000

    const found = jsonpath.query(datum.data, seriesPath)
    found.forEach((entry,entryIndex) => {
      const ts = entry['timestamp']*1000
      if(ts >= minTs && ts <= maxTs){
        const domainValue = Math.floor(ts/1000) - Math.floor(minTs/1000);
        const value = jsonpath.query(entry, entryPath)[0]
        if(value){
          if(typeof rtrn[domainValue] === "undefined"){
            rtrn[domainValue] = { _domainValue: domainValue }
          }  
          rtrn[domainValue][`${name}`] = value
        }        
      }
    })

  })
  const sorted = Object.values(rtrn)
  sorted.sort((a, b) => b._domainValue - a._domainValue);
  return {
    data: sorted
  }
}
const pmiChart = (all,seriesPath,entryPath,title,leftLabel="count",domainLabel="seconds")=>{
  const {data} = joinPmi(all,seriesPath,entryPath)
  return (
    <React.Fragment>
      <ChartContainer title={title} leftLabel={leftLabel} domainLabel={domainLabel}
        labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
          rtrn[getId(datum)] = theme.colors.chart[chartColorNames[datumIndex]][2]
          return rtrn;
        },{}) : false}      
      >
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={data}
            style={{ userSelect: 'none' }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip
              formatter={(e) => Number(e).toFixed(4)}
            />
            <XAxis
              allowDataOverflow={true}
              type="number"
              scale="time"
              dataKey="_domainValue"
              domain={[0, 960]}
              ticks={[...Array(16).keys()].map(x => x * 60)}
            //domain={domain}
            //domain={currentDomain}
            >
            </XAxis>
            <YAxis yAxisId={0} orientation="left" domain={['auto', 'auto']}>
            </YAxis>
            {all.map((entry, entryIndex) => (
              <Line
                key={`${entry.name}`}
                yAxisId={0}
                name={`${entry.name}`}
                dataKey={`${entry.name}`}
                stroke={theme.colors.chart[chartColorNames[entryIndex]][1]}
                fill={theme.colors.chart[chartColorNames[entryIndex]][1]}
                connectNulls={true}
                dot={false}
                isAnimationActive={false}
                style={{ strokeWidth: 1 }}
              />
            ))}
            <ReferenceLine x={300} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
              <Label value="steadyState" position="insideTop" />
            </ReferenceLine>
            <ReferenceLine x={300 + 600} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
              <Label value="rampDown" position="insideTop" />
            </ReferenceLine>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </React.Fragment>
  )
}

const joinVmstat = (data, path) =>{
  const rtrn = {}
  data.forEach((datum, datumIndex) => {
    const name = datum.name;
    const minTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_UP`) || [0])[0]
    const maxTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_DOWN`) || [0])[0] + 60 * 1000
    
    let found = jsonpath.query(datum.data, path)
    found = found.filter(x=>!x.hasOwnProperty('header') && !x.hasOwnProperty('column'))
    let key = Object.keys(found[0]||{}).filter(key=>key.startsWith("timestamp"));
    if(key && key.length == 1){
      key = key[0]
    }
    found.forEach(entry => {
      const ts = DateTime.fromFormat(entry[key], "yyyy-MM-dd HH:mm:ss", { zone: 'America/New_York' }).toMillis();
      if( ts >= minTs && ts <= maxTs){
        const domainValue = Math.floor(ts/1000) - Math.floor(minTs/1000);
        if (typeof rtrn[domainValue] === "undefined") {
          rtrn[domainValue] = { _domainValue: domainValue }
        }
        rtrn[domainValue][`${name}-idl`] = entry['cpu.id']
        rtrn[domainValue][`${name}-sys`] = entry['cpu.sy']
        rtrn[domainValue][`${name}-usr`] = entry['cpu.us']
        rtrn[domainValue][`${name}-usd`] = 100 - entry['cpu.id']
      }
    })
  })

  return {
    data: Object.values(rtrn)
  }
}
const joinDstat = (data, path) => {
  const rtrn = {}
  data.forEach((datum, datumIndex) => {
    const name = datum.name;
    const minTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_UP`) || [0])[0]
    const maxTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_DOWN`) || [0])[0] + 60 * 1000
    const found = jsonpath.query(datum.data, path)
    found.forEach(entry => {
      const epoch = entry['epoch.epoch'] * 1000;
      if (epoch >= minTs && epoch <= maxTs) {
        const domainValue = entry['epoch.epoch'] - Math.floor(minTs / 1000)
        if (typeof rtrn[domainValue] === "undefined") {
          rtrn[domainValue] = { _domainValue: domainValue }
        }
        rtrn[domainValue][`${name}-idl`] = entry['totalCpuUsage.idl']
        rtrn[domainValue][`${name}-sys`] = entry['totalCpuUsage.sys']
        rtrn[domainValue][`${name}-usr`] = entry['totalCpuUsage.usr']
        rtrn[domainValue][`${name}-usd`] = 100 - entry['totalCpuUsage.idl']
      }
    })
  })

  return {
    data: Object.values(rtrn)
  }
}
const dstatCharts = (all, path) => {
  //const { data } = joinDstat(all, path);
  const { data } = joinVmstat(all, path);
  return (
    <ChartContainer title="server cpu" leftLabel="%cpu" domainLabel="seconds" 
      labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
        rtrn[getId(datum)] = theme.colors.chart[chartColorNames[datumIndex]][2]
        return rtrn;
      },{}) : false}
    >
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={data}
            style={{ userSelect: 'none' }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip
              formatter={(e) => Number(e).toFixed(4)}
            />
            <XAxis
              allowDataOverflow={true}
              type="number"
              scale="time"
              dataKey="_domainValue"
              domain={['auto', 'auto']}
              ticks={[...Array(16).keys()].map(x => x * 60)}
            //domain={domain}
            //domain={currentDomain}
            >
            </XAxis>
            <YAxis yAxisId={0} orientation="left" domain={['auto', 'auto']}>
            </YAxis>
            {all.map((entry, entryIndex) => (
              <Line
                key={`${entry.name}-usd`}
                yAxisId={0}
                name={`${entry.name}`}
                dataKey={`${entry.name}-usd`}
                stroke={theme.colors.chart[chartColorNames[entryIndex]][2]}
                fill={theme.colors.chart[chartColorNames[entryIndex]][2]}
                connectNulls={true}
                dot={false}
                isAnimationActive={false}
                style={{ strokeWidth: 1 }}
              />

            ))}
            <ReferenceLine x={300} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
              <Label value="steadyState" position="insideTop" />
            </ReferenceLine>
            <ReferenceLine x={300 + 600} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
              <Label value="rampDown" position="insideTop" />
            </ReferenceLine>

          </ComposedChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
function Specj() {
  const location = useLocation();
  const [data, setData] = useState([])
  console.log("data",data)
  useEffect(
    fetchSearch("specjEnterprise", location.search, setData)
    , [location.search, setData])
  const dstats = joinVmstat(data, `$['mwperf-server03'].vmstat.*`)
  const gcs = joinGc(data, `$['mwperf-server03'].gclog[?( @.before && @.after && @.seconds )]`);
  const reasons = {};


  data.forEach(datum => {
    const { name } = datum;
    const sums = {}
    gcs.data.filter(gc => gc.hasOwnProperty(`${name}-reason`)).forEach(gc => {
      const reason = gc[`${name}-reason`];
      sums[reason] = 1 + (sums[reason] || 0)
    })
    reasons[name] = sums;
  })

  // Thu Jan 02 23:38:45 UTC 2020 
  const settingTable = data.length === 0 ? <div>loading...</div> : <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
    <thead>
      <tr>
        <th>setting</th>
        {data.map((datum, datumIndex) => (
          <th key={datumIndex}>{datum.name}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      <tr><th>scale</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`)}</td>))}</tr>
      <tr><th>rampUp</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampUp']['text()']`)}</td>))}</tr>
      <tr><th>steadyState</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:steadyState']['text()']`)}</td>))}</tr>
      <tr><th>rampDown</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampDown']['text()']`)}</td>))}</tr>
      <tr><th>max heap</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{
        /-Xmx([^ $]+)/g.exec((jsonpath.query(datum.data, `$.qdup.state['mwperf-server03.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0]||[""])[1]
      }</td>))}</tr>
      <tr><th>large pages</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{(jsonpath.query(datum.data, `$.qdup.state['mwperf-server03.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0].includes("LargePages") ? '✔' : '✕'}</td>))}</tr>
      <tr><th>jfr</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{(jsonpath.query(datum.data, `$.qdup.state['mwperf-server03.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0].includes("StartFlightRecording") ? '✔' : '✕'}</td>))}</tr>
    </tbody>
  </table>

  const colTable = data.length == 0 ? <div>loading...</div> : <table className="pf-c-table pf-m-compact pf-m-grid-md">
    <thead>
      <tr>
        <th>name</th>
        {/* <th>date</th> */}
        <th>passed</th>
        <th>{jsonpath.query(data[0].data, "$.faban.summary.benchResults.benchSummary.metric['@unit']")}</th>
        <th>duration</th>
        <th>cpu</th>
        <th>gc reasons</th>
        <th>pause seconds</th>
      </tr>
    </thead>
    <tbody>
      {data.map((v, i) => (<tr key={i}>
        <td data-label="runId">{getId(v)}</td>
        {/* <td>{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.startTime['text()']")}</td> */}
        <td>{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.passed['text()']")}</td>
        <td data-label="todo save from column header">{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.metric['text()']")}</td>
        <td>{fabanDuration(v.data).toFormat("hh:mm:ss")}</td>
        <td>{Number(
          dstats.data.map(e => {
            const value = e[`${v.name}-usd`] || 0;
            return value;
          }).reduce((a, b) => a + b, 0) / dstats.data.length
        ).toFixed(3)}</td>
        <td>
          {Object.entries(reasons[v.name]).map(([key, value]) => (<div key={key}>{key} {value}</div>))}
        </td>
        <td>{Number(gcs.data.filter(e => e.hasOwnProperty(`${v.name}-seconds`)).map(e => e[`${v.name}-seconds`]).reduce((a, b) => a + b, 0)).toFixed(3)}</td>
      </tr>))}
    </tbody>
  </table>

  const driverTables = data.length == 0 ? <div>loading...</div> : data[0].data.faban.summary.benchResults.driverSummary.map((driver, driverIndex) => (
    <React.Fragment key={"driver-" + driverIndex}>
      <h2>{driver['@name']}</h2>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
        <thead>
          <tr>
            <th>runId</th>
            <th>passed</th>
            <th className="pf-m-wrap">{jsonpath.query(data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].metric['@unit']`)}</th>
            <th className="pf-m-wrap">{jsonpath.query(data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].totalOps['@unit']`)}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (<tr key={i}>
            <td data-label="runId">{getId(v)}</td>
            <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].passed['text()']`)}</td>
            <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].metric['text()']`)}</td>
            <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].totalOps['text()']`)}</td>
          </tr>))}
        </tbody>
      </table>
      <h3>mix</h3>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
        <thead>
          <tr>
            <th></th>
            {data[0].data.faban.summary.benchResults.driverSummary[driverIndex].mix.operation.map((operation, operationIndex) => (
              <th colSpan="3" key={`operation-${operationIndex}`}>{operation["@name"]}</th>
            ))}
          </tr>
          <tr>
            <th></th>
            {[...Array(data[0].data.faban.summary.benchResults.driverSummary[driverIndex].mix.operation.length).keys()].map(operationIndex => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <th>success</th>
                <th>failure</th>
                <th>passsed</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (<tr key={i}>
            <td data-label="runId">{getId(v)}</td>
            {[...Array(v.data.faban.summary.benchResults.driverSummary[driverIndex].mix.operation.length).keys()].map(operationIndex => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <td>
                  <div>{(jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].mix.operation[${operationIndex}].successes['text()']`) || [0])[0]} </div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].mix.operation[${operationIndex}].successes['text()']`)}</div> : null}
                </td>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].mix.operation[${operationIndex}].failures['text()']`)}</td>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].mix.operation[${operationIndex}].passed['text()']`)}</td>
              </React.Fragment>
            ))}
          </tr>))}
        </tbody>
      </table>
      <h3>response times</h3>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
        <thead>
          <tr>
            <th></th>
            {data[0].data.faban.summary.benchResults.driverSummary[driverIndex].responseTimes.operation.map((operation, operationIndex) => (
              <th colSpan="5" key={`operation-${operationIndex}`}>{operation["@name"]}</th>
            ))}
          </tr>
          <tr>
            <th></th>
            {data[0].data.faban.summary.benchResults.driverSummary[driverIndex].responseTimes.operation.map((operation, operationIndex) => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <th>sd</th>
                <th>avg</th>
                <th>p90th</th>
                <th>p99th</th>
                <th>max</th>
                {/* <th>passed</th> */}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (<tr key={i}>
            <td data-label="runId">{getId(v)}</td>
            {[...Array(v.data.faban.summary.benchResults.driverSummary[driverIndex].responseTimes.operation.length).keys()].map(operationIndex => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <td>
                  <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].sd['text()']`)}</div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].sd['text()']`)}</div> : null}
                </td>
                <td>
                  <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].avg['text()']`)}</div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].avg['text()']`)}</div> : null}
                </td>
                <td>
                  <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].p90th['text()']`)}</div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].p90th['text()']`)}</div> : null}
                </td>
                <td>
                  <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].p99th['text()']`)}</div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].p99th['text()']`)}</div> : null}
                </td>
                <td>
                  <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].max['text()']`)}</div>
                  {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].max['text()']`)}</div> : null}
                </td>
                {/* <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].responseTimes.operation[${operationIndex}].passed['text()']`)}</td> */}
              </React.Fragment>
            ))}
          </tr>))}
        </tbody>
      </table>
      <h3>cycle times</h3>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
        <thead>
          <tr>
            <th></th>
            {data[0].data.faban.summary.benchResults.driverSummary[driverIndex].delayTimes.operation.map((operation, operationIndex) => (
              <th colSpan="4" key={`operation-${operationIndex}`}>{operation["@name"]}</th>
            ))}
          </tr>
          <tr>
            <th></th>
            {data[0].data.faban.summary.benchResults.driverSummary[driverIndex].delayTimes.operation.map((operation, operationIndex) => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <th>target</th>
                <th>avg</th>
                <th>min</th>
                <th>max</th>
                {/* <th>passed</th> */}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (<tr key={i}>
            <td data-label="runId">{getId(v)}</td>
            {[...Array(v.data.faban.summary.benchResults.driverSummary[driverIndex].delayTimes.operation.length).keys()].map(operationIndex => (
              <React.Fragment key={`operation-${operationIndex}`}>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].delayTimes.operation[${operationIndex}].targetedAvg['text()']`)}</td>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].delayTimes.operation[${operationIndex}].actualAvg['text()']`)}</td>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].delayTimes.operation[${operationIndex}].min['text()']`)}</td>
                <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].delayTimes.operation[${operationIndex}].max['text()']`)}</td>
                {/* <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary[${driverIndex}].delayTimes.operation[${operationIndex}].passed['text()']`)}</td> */}
              </React.Fragment>
            ))}
          </tr>))}
        </tbody>
      </table>
    </React.Fragment>
  ))

  return (
    <div className="pf-c-content">
      <div className="pf-c-card">
        <div className="">
          <Helmet>
            <title>Spec {data.map(getId).join(" ")}</title>
          </Helmet>
        </div>
        <div className="pf-c-card__body">
          <h1>SPECjEnterprise2010</h1>
          {/*  const ds = joinPmi(data,`$['mwperf-server03'].pmi.datasource[*]`,`$.data.result[?(@.result["jndi-name"] == "java:/jdbc/SPECjOrderDS")].result.statistics.pool.InUseCount`) */}
          {/* <h3>datasource connections</h3> */}
          {/* {pmiChart(data,`$['mwperf-server03'].pmi.datasource[*]`,`$.data.result[?(@.result["jndi-name"] == "java:/jdbc/SPECjOrderDS")].result.statistics.pool.InUseCount`,"SPECjOrderDS active connections","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.datasource[*]`,`$.data.result[?(@.result["jndi-name"] == "java:/jdbc/SPECjMfgDS")].result.statistics.pool.InUseCount`,"SPECjMfgDS active connections","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.datasource[*]`,`$.data.result[?(@.result["jndi-name"] == "java:/jdbc/SPECjSupplierDS")].result.statistics.pool.InUseCount`,"SPECjSupplierDS active connections","count","seconds")} */}
          
          <h3>Run Info</h3>
          {colTable}          
          {dstatCharts(data, `$['mwperf-server03'].vmstat.*`)}

          <div style={{ pageBreakInside: 'avoid' }}>
            {driverTables}
          </div>
          
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>gc</h3>
            {gcCharts(data, `$['mwperf-server03'].gclog[?( @.before && @.after && @.seconds )]`)}          
          </div>
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>MfgDriver Response Times (seconds)</h3>
            {xanTimeChart(data, '$.xan.detail[?(@.section=="MfgDriver Response Times (seconds)")]')}
          </div>
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>MfgDriver Response Times Distribution</h3>
            {xanDistributionChart(data, '$.xan.detail[?(@.section=="MfgDriver Frequency Distribution of Response Times (seconds)")]')}
          </div>
          <h3>MfgDriver Throughput</h3>
            <div style={{ pageBreakInside: 'avoid' }}>          
            {xanTimeChart(data, '$.xan.detail[?(@.section=="MfgDriver Throughput")]', "tps")}
          </div>
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>DealerDriver Response Times (seconds)</h3>
            {xanTimeChart(data, '$.xan.detail[?(@.section=="DealerDriver Response Times (seconds)")]')}
          </div>
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>DealerDriver Response Times Distribution</h3>
            {xanDistributionChart(data, '$.xan.detail[?(@.section=="DealerDriver Frequency Distribution of Response Times (seconds)")]')}
          </div>
          <div style={{ pageBreakInside: 'avoid' }}>
            <h3>DealerDriver Throughput</h3>
            {xanTimeChart(data, '$.xan.detail[?(@.section=="DealerDriver Throughput")]', "tps")}          
          </div>
          {settingTable}          

          {/* busy-task-thread-count, queue-size */}
          <h3>io workers</h3>
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "default")].result["busy-task-thread-count"]`,"default threads","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "default")].result["queue-size"]`,"default queue","count","seconds")}
          
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "httpWorker")].result["busy-task-thread-count"]`,"httpWorker threads","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "httpWorker")].result["queue-size"]`,"httpWorker queue","count","seconds")}

          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "wsWorker")].result["busy-task-thread-count"]`,"wsWorker threads","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "wsWorker")].result["queue-size"]`,"wsWorker queue","count","seconds")}
          
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "ejbWorker")].result["busy-task-thread-count"]`,"ejbWorker threads","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "ejbWorker")].result["queue-size"]`,"ejbWorker queue","count","seconds")}
          
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "supplierWorker")].result["busy-task-thread-count"]`,"supplierWorker threads","count","seconds")}
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "supplierWorker")].result["queue-size"]`,"supplierWorker queue","count","seconds")}
          
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "dealerWorker")].result["busy-task-thread-count"]`,"dealerWorker threads","count","seconds")}          
          {pmiChart(data,`$['mwperf-server03'].pmi.io.worker[*]`,`$.data.result[?(@.address[1].worker == "dealerWorker")].result["queue-size"]`,"dealerWorker queue","count","seconds")}

        </div>
      </div>
    </div>
  );
}

export default Specj;
