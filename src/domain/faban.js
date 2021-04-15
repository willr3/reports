import React, { useState, useEffect } from 'react';
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
import ChartContainer from '../components/ChartContainer';

import jsonpath from 'jsonpath';
import { DateTime } from 'luxon'

import theme, {
    chartColors,
    chartColorNames
  } from '../theme';
  
const defaultId = (datum)=>datum.data.qdup.state["mwperf-server03.perf.lab.eng.rdu2.redhat.com"].RUNTIME_NAME+"_"+datum.name+"_"+jsonpath.query(datum.data, `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`)

export const fabanDuration = (data) => {
    const startText = (jsonpath.query(data, "$.faban.summary.benchResults.benchSummary.startTime['text()']")[0] || "").replaceAll(/ E.T/g,"");
    const start = DateTime.fromFormat(startText, "EEE MMM dd HH:mm:ss yyyy", { zone: 'utc' });
    const endText = (jsonpath.query(data, "$.faban.summary.benchResults.benchSummary.endTime['text()']")[0] || "").replaceAll(/ E.T/g,"");
    const end = DateTime.fromFormat(endText, "EEE MMM dd HH:mm:ss yyyy", { zone: 'utc' });
    const duration = end.diff(start);
    return duration;    
}
export const joinXan = (data, path) => {
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
  export const xanDistributionChart = (all, path, unit = "requests", getId = defaultId) => {
    const { headers, data, time } = joinXan(all, path);
    data.sort((a, b) => a[time] - b[time])//somehow it is in the wrong order for 1402
    return headers.map((header, index) => {
      return (
          <ChartContainer key={index} title={header} leftLabel={unit} domainLabel="seconds" 
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
                  scale="linear"
                  dataKey={time}
                  domain={['auto', 'auto']}
                >
                </XAxis>
                <YAxis yAxisId={0} orientation="left" domain={[0, 'auto']}>                
                </YAxis>
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-${header}`}
                    yAxisId={0}
                    name={`${entry.name}`}
                    dataKey={`${entry.name}-${header}`}
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
    })
  }
  export const xanTimeChart = (all, path, unit = "seconds", getId = defaultId) => {
    const { headers, data } = joinXan(all, path);
    return headers.map((header, index) => {
      return (
        <ChartContainer key={index} title={header} leftLabel={unit} domainLabel="seconds" 
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
                  dataKey="Time (s)"
                  domain={['auto', 'auto']}
                  ticks={[...Array(16).keys()].map(x => x * 60)}
                >
                </XAxis>
                <YAxis yAxisId={0} orientation="left" domain={[0, 'auto']}>
                </YAxis>
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-${header}`}
                    yAxisId={0}
                    name={`${entry.name}`}
                    dataKey={`${entry.name}-${header}`}
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
    })
  }