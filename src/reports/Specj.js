import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsonpath from 'jsonpath';
import { DateTime } from 'luxon'
import * as qs from 'query-string';
import { useHistory, useParams, useLocation } from "react-router"
import {
  Area,
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
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';


import { fetchSearch } from '../redux/actions';
import ChartContainer from '../components/ChartContainer';

const duration = (data) => {
  const startText = jsonpath.query(data, "$.faban.summary.benchResults.benchSummary.startTime['text()']")[0] || "";
  const start = DateTime.fromFormat(startText, "EEE MMM dd HH:mm:ss 'UTC' yyyy", { zone: 'utc' });
  const endText = jsonpath.query(data, "$.faban.summary.benchResults.benchSummary.endTime['text()']")[0] || ""
  const end = DateTime.fromFormat(endText, "EEE MMM dd HH:mm:ss 'UTC' yyyy", { zone: 'utc' });
  const duration = end.diff(start);
  return duration;
}
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

const colors = {
  blue: ["#8BC1F7", "#519DE9", "#0066CC", "#004B95", "#002F5D"],
  green: ["#A2D99C", "#88D080", "#6EC664", "#509149", "#3B6C37"],
  purple: ["#CBC0FF", "#B1A3FF", "#A18FFF", "#8476D1", "#6753AC"],
  cyan: ["#8BB4B9", "#5C969D", "#2E7981", "#015C65", "#00434B"],
  gold: ["#F9E0A2", "#F6D173", "#F4C145", "#F0AB00", "#C58C00"],
  orange: ["#F4B678", "#EF9234", "#EC7A08", "#C46100", "#8F4700"]
}
const colorNames = Object.keys(colors)
const colorList = []
for (var i = 0; i < colors[colorNames[0]].length; i++) {
  for (var n = 0; n < colorNames.length; n++) {
    colorList.push(colors[colorNames[n]][i])
  }
}
const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0)
const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")
const joinGc = (data, path) => {
  const rtrn = {}
  data.forEach((datum, datumIndex) => {
    const name = datum.name;
    const starting = (jsonpath.query(datum.data, `$.qdup.latches.SERVER_STARTING`) || [0])[0]
    const minTs = Math.floor(((jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_UP`) || [0])[0] - starting) / 1000)
    const maxTs = Math.floor((((jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_DOWN`) || [0])[0] + 60 * 1000) - starting) / 1000)
    const found = jsonpath.query(datum.data, path)
    let prev = 0;
    found.forEach((entry, entryIndex) => {
      const ts = entry['timestamp']
      if (ts >= minTs && ts <= maxTs) {
        prev = ts - minTs;

        if (typeof rtrn[ts] === "undefined") {
          rtrn[ts] = { _domainValue: ts - minTs }
        }
        rtrn[ts][`${name}-before`] = entry["before"] / (1024 * 1024)
        rtrn[ts][`${name}-after`] = entry["after"] / (1024 * 1024)
        rtrn[ts][`${name}-freed`] = rtrn[ts][`${name}-before`] - rtrn[ts][`${name}-after`]
        rtrn[ts][`${name}-seconds`] = entry["seconds"]
        rtrn[ts][`${name}-reason`] = entry["reason"]
      }
    })
  })
  const sorted = Object.values(rtrn)
  sorted.sort((a, b) => b._domainValue - a._domainValue);
  return {
    data: sorted
  }
}
const gcCharts = (all, path) => {
  const { data } = joinGc(all, path)
  const legendPayload = all.map((datum, datumIndex) => ({
    color: colors[colorNames[datumIndex]][2],
    fill: colors[colorNames[datumIndex]][2],
    type: 'rect',
    value: datum.name
  }));
  return (
    <React.Fragment>
      <ChartContainer title={<h3>Heap before GC</h3>} leftLabel="Mb" domainLabel="seconds" 
        labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
          console.log("gc.datum",datum)
          rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
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
                  key={`${entry.name}-before`}
                  yAxisId={0}
                  name={`${entry.name} before`}
                  dataKey={`${entry.name}-before`}
                  stroke={colors[colorNames[entryIndex]][1]}
                  fill={colors[colorNames[entryIndex]][1]}
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
      <ChartContainer title="Heap after GC" leftLabel="Mb" domainLabel="seconds" 
        labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
          rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
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
                {/* <Label value="Mb" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
              </YAxis>
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name}-after`}
                  yAxisId={0}
                  name={`${entry.name} after`}
                  dataKey={`${entry.name}-after`}
                  stroke={colors[colorNames[entryIndex]][2]}
                  fill={colors[colorNames[entryIndex]][2]}
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
      <ChartContainer title="Heap freed in GC" leftLabel="Mb" domainLabel="seconds" 
        labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
          rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
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
                <Label value="Mb" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Legend align="left" payload={legendPayload} />
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name}-freed`}
                  yAxisId={0}
                  name={`${entry.name} freed`}
                  dataKey={`${entry.name}-freed`}
                  stroke={colors[colorNames[entryIndex]][2]}
                  fill={colors[colorNames[entryIndex]][2]}
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
      <ChartContainer title="GC duration" leftLabel="Mb" domainLabel="seconds" 
        labels={all.length > 1 ? all.reduce((rtrn,datum,datumIndex)=>{
          rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
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
                {/* <Label value="seconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
              </YAxis>
              {/* <Legend align="left" payload={legendPayload} /> */}
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name} seconds`}
                  yAxisId={0}
                  name={`${entry.name}-seconds`}
                  dataKey={`${entry.name}-seconds`}
                  stroke={colors[colorNames[entryIndex]][3]}
                  fill={colors[colorNames[entryIndex]][3]}
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
  const { data } = joinDstat(all, path);
  return (
    <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
      <div className="pf-c-card__header pf-c-title pf-m-md">
      </div>
      <div className="pf-c-card__body">
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
              <Label value="%cpu" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Legend align="left" />
            {all.map((entry, entryIndex) => (
              <Line
                key={`${entry.name}-usd`}
                yAxisId={0}
                name={`${entry.name}`}
                dataKey={`${entry.name}-usd`}
                stroke={colors[colorNames[entryIndex]][2]}
                fill={colors[colorNames[entryIndex]][2]}
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
      </div>
    </div>
  )
}
const joinXan = (data, path) => {
  const rtrn = {};
  const headers = {}
  let time = ""
  data.forEach((v, i) => {
    const xan = jsonpath.query(v.data, path)[0];
    const name = xan.section
    const header = xan.header;
    time = header.shift();
    xan.data.forEach(entry => {
      if (typeof rtrn[entry[time]] === "undefined") {
        rtrn[entry[time]] = { [time]: entry[time] }
      }
      header.forEach(h => {
        headers[h] = h;
        rtrn[entry[time]][v.name + "-" + h] = entry[h]
      })

    })
  })
  return {
    headers: Object.keys(headers),
    data: Object.values(rtrn),
    time
  }
}
const xanDistributionChart = (all, path, unit = "requests") => {
  const { headers, data, time } = joinXan(all, path);
  data.sort((a, b) => a[time] - b[time])//somehow it is in the wrong order for 1402
  return headers.map((header, index) => {
    return (
      <div className="pf-c-card" key={index} style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__header pf-c-title pf-m-md">
          {header}
        </div>
        <div className="pf-c-card__body">
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
                scale="linear"
                dataKey={time}
                domain={['auto', 'auto']}
              >
              </XAxis>
              <YAxis yAxisId={0} orientation="left" domain={[0, 'auto']}>
                <Label value={unit} position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Legend align="left" />
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name}-${header}`}
                  yAxisId={0}
                  name={`${entry.name}`}
                  dataKey={`${entry.name}-${header}`}
                  stroke={colors[colorNames[entryIndex]][2]}
                  fill={colors[colorNames[entryIndex]][2]}
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
        </div>
      </div>

    )
  })
}
const xanTimeChart = (all, path, unit = "seconds") => {
  const { headers, data } = joinXan(all, path);
  return headers.map((header, index) => {
    return (
      <div className="pf-c-card" key={index} style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__header pf-c-title pf-m-md">
          {header}
        </div>
        <div className="pf-c-card__body">
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
                dataKey="Time (s)"
                domain={['auto', 'auto']}
                ticks={[...Array(16).keys()].map(x => x * 60)}
              >
              </XAxis>
              <YAxis yAxisId={0} orientation="left" domain={[0, 'auto']}>
                <Label value={unit} position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Legend align="left" />
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name}-${header}`}
                  yAxisId={0}
                  name={`${entry.name}`}
                  dataKey={`${entry.name}-${header}`}
                  stroke={colors[colorNames[entryIndex]][2]}
                  fill={colors[colorNames[entryIndex]][2]}
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
        </div>
      </div>
    )
  })
}

function Specj() {
  const location = useLocation();
  const [data, setData] = useState([])
  console.log(data)
  useEffect(
    fetchSearch("specjEnterprise", location.search, setData)
    , [location.search, setData])


  const dstats = joinDstat(data, `$.benchserver4.dstat[?(@['epoch.epoch'])]`)
  const gcs = joinGc(data, `$.benchserver4.gclog[?( @.before && @.after && @.seconds )]`);
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
  const settingTable = data.length === 0 ? <div>loading...</div> : <table className="pf-c-table pf-m-compact pf-m-grid-md">
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
        /-Xmx([^ $]+)/g.exec((jsonpath.query(datum.data, `$.qdup.state['benchserver4.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0])[1]
      }</td>))}</tr>
      <tr><th>large pages</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{(jsonpath.query(datum.data, `$.qdup.state['benchserver4.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0].includes("LargePages") ? '✔' : '✕'}</td>))}</tr>
      <tr><th>jfr</th>{data.map((datum, datumIndex) => (<td key={datumIndex}>{(jsonpath.query(datum.data, `$.qdup.state['benchserver4.perf.lab.eng.rdu2.redhat.com']..JAVA_OPTS`) || [""])[0].includes("StartFlightRecording") ? '✔' : '✕'}</td>))}</tr>
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
        <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
        {/* <td>{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.startTime['text()']")}</td> */}
        <td>{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.passed['text()']")}</td>
        <td data-label="todo save from column header">{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.metric['text()']")}</td>
        <td>{duration(v.data).toFormat("hh:mm:ss")}</td>
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
            <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
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
            <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
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
            <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
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
            <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
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

        </div>
        <div className="pf-c-card__body">
          <h1>SPECjEnterprise2010</h1>
          {/* {settingTable} */}
          <h3>Run Info</h3>
          {colTable}
          <h3>gc</h3>
          {gcCharts(data, `$.benchserver4.gclog[?( @.before && @.after && @.seconds )]`)}
          <h3>server cpu</h3>
          {dstatCharts(data, `$.benchserver4.dstat[?(@['epoch.epoch'])]`)}
          <h3>MfgDriver Response Times (seconds)</h3>
          {xanTimeChart(data, '$.xan.detail[?(@.section=="MfgDriver Response Times (seconds)")]')}
          <h3>MfgDriver Response Times Distribution</h3>
          {xanDistributionChart(data, '$.xan.detail[?(@.section=="MfgDriver Frequency Distribution of Response Times (seconds)")]')}
          <h3>MfgDriver Throughput</h3>
          {xanTimeChart(data, '$.xan.detail[?(@.section=="MfgDriver Throughput")]', "tps")}
          <h3>DealerDriver Response Times (seconds)</h3>
          {xanTimeChart(data, '$.xan.detail[?(@.section=="DealerDriver Response Times (seconds)")]')}
          <h3>DealerDriver Response Times Distribution</h3>
          {xanDistributionChart(data, '$.xan.detail[?(@.section=="DealerDriver Frequency Distribution of Response Times (seconds)")]')}
          <h3>DealerDriver Throughput</h3>
          {xanTimeChart(data, '$.xan.detail[?(@.section=="DealerDriver Throughput")]', "tps")}
          {driverTables}
        </div>
      </div>
    </div>
  );
}

export default Specj;
