import React from 'react';
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
import ChartContainer from '../components/ChartContainer';

import jsonpath from 'jsonpath';

import theme, {
    chartColorNames
  } from '../theme';
  
const defaultId = (datum)=>datum.data.qdup.state["mwperf-server03.perf.lab.eng.rdu2.redhat.com"].RUNTIME_NAME+"_"+datum.name+"_"+jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`)

export const joinGc = (data, path) => {
    const rtrn = {}
    data.forEach((datum, datumIndex) => {
      //const name = datum.data.qdup.state["mwperf-server03.perf.lab.eng.rdu2.redhat.com"].RUNTIME_NAME;
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
export const gcCharts = (all, path, getId = defaultId) => {
    const { data } = joinGc(all, path)
    return (
      <React.Fragment>
        <ChartContainer title="GC duration" leftLabel="seconds" domainLabel="seconds" 
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
                  {/* <Label value="seconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                </YAxis>
                {/* <Legend align="left" payload={legendPayload} /> */}
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name} seconds`}
                    yAxisId={0}
                    name={`${entry.name}-seconds`}
                    dataKey={`${entry.name}-seconds`}
                    stroke={theme.colors.chart[chartColorNames[entryIndex]][3]}
                    fill={theme.colors.chart[chartColorNames[entryIndex]][3]}
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
        <ChartContainer title="Heap before GC" leftLabel="Mb" domainLabel="seconds" 
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
                    key={`${entry.name}-before`}
                    yAxisId={0}
                    name={`${entry.name} before`}
                    dataKey={`${entry.name}-before`}
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
        <ChartContainer title="Heap after GC" leftLabel="Mb" domainLabel="seconds" 
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
                  {/* <Label value="Mb" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                </YAxis>
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-after`}
                    yAxisId={0}
                    name={`${entry.name} after`}
                    dataKey={`${entry.name}-after`}
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
        <ChartContainer title="Heap freed in GC" leftLabel="Mb" domainLabel="seconds" 
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
                  <Label value="Mb" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                </YAxis>
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-freed`}
                    yAxisId={0}
                    name={`${entry.name} freed`}
                    dataKey={`${entry.name}-freed`}
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
      </React.Fragment>
    )
  }