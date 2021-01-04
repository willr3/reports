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
import reducer from '../domain/reducer';
import '../App.css';

import { fetchSearch } from '../redux/actions';
import ChartContainer from '../components/ChartContainer';
import { chartColors } from '../theme';

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
        if (ts - minTs < prev) {
          console.log("ts < prev", ts, prev, minTs, entry, found[entryIndex - 1])
        }
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
    value: datum.data.qdup.state.RUNTIME_NAME
  }));
  return (
    <React.Fragment>
      <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__body">
          <ChartContainer
            title="Heap before GC"
            leftLabel="Mb"
            domainLabel="seconds"
            labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
              rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
              return rtrn;
            }, {}) : false}
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
                {/* <Legend align="left" payload={legendPayload} /> */}
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-before`}
                    yAxisId={0}
                    name={`${entry.data.qdup.state.RUNTIME_NAME} before`}
                    dataKey={`${entry.name}-before`}
                    stroke={colors[colorNames[entryIndex]][1]}
                    fill={colors[colorNames[entryIndex]][1]}
                    connectNulls={true}
                    dot={false}
                    isAnimationActive={false}
                    style={{ strokeWidth: 2 }}
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

        </div>
      </div>
      <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__body">
          <ChartContainer
            title="Heap after GC"
            leftLabel="Mb"
            domainLabel="seconds"
            labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
              rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
              return rtrn;
            }, {}) : false}
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
                {/* <Legend align="left" payload={legendPayload} /> */}
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-after`}
                    yAxisId={0}
                    name={`${entry.data.qdup.state.RUNTIME_NAME} after`}
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
        </div>
      </div>
      <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__body">
          <ChartContainer
            title="Heap freed in GC"
            leftLabel="Mb"
            domainLabel="seconds"
            labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
              rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
              return rtrn;
            }, {}) : false}
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
                {/* <Legend align="left" payload={legendPayload} /> */}
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-freed`}
                    yAxisId={0}
                    name={`${entry.data.qdup.state.RUNTIME_NAME} freed`}
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

        </div>
      </div>
      <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__body">
          <ChartContainer
            title="GC duration"
            leftLabel="Mb"
            domainLabel="seconds"
            labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
              rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
              return rtrn;
            }, {}) : false}
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
                    name={`${entry.data.qdup.state.RUNTIME_NAME}-seconds`}
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
        </div>
      </div>
    </React.Fragment>
  )
}
const joinPmi = (data, path, selectors) => {
  const rtrn = {}
  data.forEach((datum, datumIndex) => {
    const name = datum.name
    const minTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_UP`) || [0])[0]
    const maxTs = (jsonpath.query(datum.data, `$.qdup.latches.FABAN_RAMP_DOWN`) || [0])[0] + 60 * 1000
    const found = jsonpath.query(datum.data, path)
    found.forEach((entry, entryIndex) => {
      const ts = entry.timestamp * 1000
      if (ts >= minTs && ts <= maxTs) {
        const domainValue = Math.floor((ts - minTs) / 1000)
        if (typeof rtrn[domainValue] === "undefined") {
          rtrn[domainValue] = { _domainValue: domainValue }
        }
        Object.keys(selectors).forEach((selectorKey, selectorIndex) => {
          const selector = selectors[selectorKey]
          if (typeof selector === "function") {
            rtrn[domainValue][`${name}-${selectorKey}`] = selector(entry, entryIndex, found)
          } else if (typeof selector === "string") {
            if (selector.startsWith("$.")) {
              rtrn[domainValue][`${name}-${selectorKey}`] = (jsonpath.query(entry, selector) || [0])[0]
            } else {
              rtrn[domainValue][`${name}-${selectorKey}`] = entry[selector]
            }
          } else {
            console.log("WTF selector is ", selectorKey, typeof selector, selector)
          }
        })
      }
    })
  })
  return {
    data: Object.values(rtrn)
  }
}
const pmiChart = (all, path, selectors, unit = "threads") => {
  const { data } = joinPmi(all, path, selectors)
  return (
    <div className="pf-c-card" style={{ pageBreakInside: 'avoid' }}>
      <div className="pf-c-card__header pf-c-title pf-m-md">
      </div>
      <div className="pf-c-card__body">
        <ChartContainer
          title={false}
          leftLabel={unit}
          domainLabel="seconds"
          labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
            rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
            return rtrn;
          }, {}) : false}
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
              />
              <YAxis yAxisId={0} orientation="left" domain={['auto', 'auto']}>
                {/* <Label value={unit} position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
              </YAxis>
              {/* <Legend align="left" /> */}
              <ReferenceLine x={300} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
                <Label value="steadyState" position="insideTop" />
              </ReferenceLine>
              <ReferenceLine x={300 + 600} isFront={true} yAxisId={0} style={{ strokeWidth: 2 }}>
                <Label value="rampDown" position="insideTop" />
              </ReferenceLine>
              {all.map((entry, entryIndex) => (
                Object.keys(selectors).map((selectorKey, selectorIndex) => (
                  <Line
                    key={`${entry.name}-${selectorKey}`}
                    yAxisId={0}
                    name={`${entry.data.qdup.state.RUNTIME_NAME}-${selectorKey}`}
                    dataKey={`${entry.name}-${selectorKey}`}
                    stroke={colors[colorNames[entryIndex]][2]}
                    fill={colors[colorNames[entryIndex]][2]}
                    connectNulls={true}
                    dot={false}
                    isAnimationActive={false}
                    style={{ strokeWidth: 1 }}
                  />))
              ))
              }
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
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
      <div className="pf-c-card__body">
        <ChartContainer
          title="server cpu"
          leftLabel="% cpu"
          domainLabel="seconds"
          labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
            rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
            return rtrn;
          }, {}) : false}
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
                {/* <Label value="%cpu" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
              </YAxis>
              {/* <Legend align="left" /> */}
              {all.map((entry, entryIndex) => (
                <Line
                  key={`${entry.name}-usd`}
                  yAxisId={0}
                  name={`${entry.data.qdup.state.RUNTIME_NAME}`}
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
        </ChartContainer>

      </div>
    </div>
  )
}
const joinXan = (data, path) => {
  const rtrn = {};
  const headers = {}
  data.forEach((v, i) => {
    const xan = jsonpath.query(v.data, path)[0];
    const name = xan.section
    const header = xan.header;
    const time = header.shift();
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
    data: Object.values(rtrn)
  }
}
const xanCharts = (all, path, unit = "seconds") => {
  const { headers, data } = joinXan(all, path);
  return headers.map((header, index) => {
    return (
      <div className="pf-c-card" key={index} style={{ pageBreakInside: 'avoid' }}>
        <div className="pf-c-card__body">
          <ChartContainer
            title={header}
            leftLabel={unit}
            domainLabel="seconds"
            labels={all.length > 1 ? all.reduce((rtrn, datum, datumIndex) => {
              rtrn[datum.data.qdup.state.RUNTIME_NAME] = colors[colorNames[datumIndex]][2]
              return rtrn;
            }, {}) : false}
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
                //domain={domain}
                //domain={currentDomain}
                >
                </XAxis>
                <YAxis yAxisId={0} orientation="left" domain={[0, 'auto']}>
                  {/* <Label value={unit} position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                </YAxis>
                {/* <Legend align="left" /> */}
                {all.map((entry, entryIndex) => (
                  <Line
                    key={`${entry.name}-${header}`}
                    yAxisId={0}
                    name={`${entry.data.qdup.state.RUNTIME_NAME}`}
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
          </ChartContainer>
        </div>
      </div>
    )
  })

}



function Web() {
  const location = useLocation();
  const [data, setData] = useState([])
  console.log("data", data);
  useEffect(
    fetchSearch("webProfile", location.search, setData)
    , [location.search, setData])

  const dstats = joinDstat(data, `$.benchserver4.dstat[?(@['epoch.epoch'])]`)

  const reducedDstats = reducer(
    data,
    {
      idl: "totalCpuUsage.idl",
      sys: "totalCpuUsage.sys",
      usr: "totalCpuUsage.usr",
      usd: (e, i, a) => 100 - e['totalCpuUsage.idl']
    },
    {
      getSeries: `$.data.benchserver4.dstat[?(@['epoch.epoch'])]`,//[?(@['epoch.epoch'])]
      getDomain: (v, i, a, d) => {
        return jsonpath.value(v, `$["epoch.epoch"]`) - (jsonpath.value(d, `$.data.qdup.latches.FABAN_RAMP_UP`) || 0) / 1000
      },
      method: "query"
    }
  ).filter(v => v.__domainValue > 0)
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
          <th key={datumIndex}>{datum.data.qdup.state.RUNTIME_NAME}</th>
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
        <td>{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.passed['text()']")}</td>
        <td data-label="todo save from column header">{jsonpath.query(v.data, "$.faban.summary.benchResults.benchSummary.metric['text()']")}</td>
        <td>{duration(v.data).toFormat("hh:mm:ss")}</td>
        <td>{Number(dstats.data.map(e => e[`${v.name}-usd`]).reduce((a, b) => a + (b || 0), 0) / dstats.data.length).toFixed(3)}</td>
        <td>
          {Object.entries(reasons[v.name]).map(([key, value]) => (<div key={key}>{key} {value}</div>))}
        </td>
        <td>{Number(gcs.data.filter(e => e.hasOwnProperty(`${v.name}-seconds`)).map(e => e[`${v.name}-seconds`]).reduce((a, b) => a + b, 0)).toFixed(3)}</td>
      </tr>))}
    </tbody>
  </table>

  const driverTable = (driver, driverIndex) => (
    <React.Fragment key={"driver-" + driverIndex}>
      <h2>{driver['@name']}</h2>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
        <thead>
          <tr>
            <th>runId</th>
            <th>passed</th>
            <th className="pf-m-wrap">{jsonpath.query(driver, `$.metric['@unit']`)}</th>
            <th className="pf-m-wrap">{jsonpath.query(driver, `$.totalOps['@unit']`)}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (<tr key={i}>
            <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
            <td>{jsonpath.query(driver, `$.passed['text()']`)}</td>
            <td>{jsonpath.query(driver, `$.metric['text()']`)}</td>
            <td>{jsonpath.query(driver, `$.totalOps['text()']`)}</td>
          </tr>))}
        </tbody>
      </table>
      <h3>mix</h3>
      {driver.mix.operation.map((operation, operationIndex) => (
        <React.Fragment key={`operation-${operationIndex}`}>
          <h4>{operation["@name"]}</h4>
          <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
            <thead>
              <tr>
                <th></th>
                <th>success</th>
                <th>failure</th>
                <th>passsed</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={i}>
                  <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
                  <td>
                    <div>{(jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.mix.operation[${operationIndex}].successes['text()']`) || [0])[0]} </div>
                    {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.mix.operation[${operationIndex}].successes['text()']`)}</div> : null}
                  </td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.mix.operation[${operationIndex}].failures['text()']`)}</td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.mix.operation[${operationIndex}].passed['text()']`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      ))}
      <h3>response times</h3>
      {driver.responseTimes.operation.map((operation, operationIndex) => (
        <React.Fragment key={`operation-${operationIndex}`}>
          <h4 >{operation["@name"]}</h4>
          <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
            <thead>
              <tr>
                <th></th>
                <th>sd</th>
                <th>avg</th>
                <th>p90th</th>
                <th>p99th</th>
                <th>max</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={i}>
                  <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
                  <td>
                    <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].sd['text()']`)}</div>
                    {/* { i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].sd['text()']`)}</div> : null } */}
                  </td>
                  <td>
                    <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].avg['text()']`)}</div>
                    {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].avg['text()']`)}</div> : null}
                  </td>
                  <td>
                    <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].p90th['text()']`)}</div>
                    {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].p90th['text()']`)}</div> : null}
                  </td>
                  <td>
                    <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].p99th['text()']`)}</div>
                    {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].p99th['text()']`)}</div> : null}
                  </td>
                  <td>
                    <div>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].max['text()']`)}</div>
                    {i > 0 ? <div className="diff">{percentDiff(v.data, data[0].data, `$.faban.summary.benchResults.driverSummary.responseTimes.operation[${operationIndex}].max['text()']`)}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      ))}
      <h3>cycle times</h3>
      {driver.delayTimes.operation.map((operation, operationIndex) => (
        <React.Fragment key={`operation${operationIndex}`}>
          <h4>{operation["@name"]}</h4>
          <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ pageBreakInside: 'avoid' }}>
            <thead>
              <tr>
                <th></th>
                <th>target</th>
                <th>avg</th>
                <th>min</th>
                <th>max</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={i}>
                  <td data-label="runId">{v.data.qdup.state.RUNTIME_NAME}</td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.delayTimes.operation[${operationIndex}].targetedAvg['text()']`)}</td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.delayTimes.operation[${operationIndex}].actualAvg['text()']`)}</td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.delayTimes.operation[${operationIndex}].min['text()']`)}</td>
                  <td>{jsonpath.query(v.data, `$.faban.summary.benchResults.driverSummary.delayTimes.operation[${operationIndex}].max['text()']`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      ))}
    </React.Fragment>
  )

  const driverTables = data.length == 0 ? <div>loading...</div> : driverTable(data[0].data.faban.summary.benchResults.driverSummary, 0);

  return (
    <div className="pf-c-content">
      <div className="pf-c-card">
        <div className="pf-c-card__body">
          <h1>SPECjEnterprise Web Profile</h1>
          {/* {settingTable} */}
          <h3>Run Info</h3>
          {colTable}
          <h3>gc</h3>
          {gcCharts(data, `$.benchserver4.gclog[?( @.before && @.after && @.seconds )]`)}
          {dstatCharts(data, `$.benchserver4.dstat[?(@['epoch.epoch'])]`)}
          <h3>InsuranceDriver Response Times (seconds)</h3>
          {xanCharts(data, '$.xan.detail[?(@.section=="InsuranceDriver Response Times (seconds)")]')}
          <h3>InsuranceDriver Throughput</h3>
          {xanCharts(data, '$.xan.detail[?(@.section=="InsuranceDriver Throughput")]', "tps")}
          {
            ["httpWorker", "wsWorker", "ejbWorker", "vehicleWorker", "insProviderWorker", "supplierWorker"].map((poolName, poolIndex) => (
              <React.Fragment key={poolIndex}>
                <h3>{poolName} threads</h3>
                {pmiChart(data, `$.benchserver4.pmi.io.worker[*]`,
                  {
                    [poolName]: `$.data.result[?( @.address[1].worker==\"${poolName}\")].result['busy-task-thread-count']`,
                  }
                )}
                <h3>{poolName} connections</h3>
                {pmiChart(data, `$.benchserver4.pmi.io.worker[*]`,
                  {
                    [poolName]: (entry, index, all) => {
                      const sum = jsonpath.query(entry, `$.data.result[?( @.address[1].worker==\"${poolName}\")].result.server[*]['connection-count']`).reduce((a, b) => a + b, 0)
                      return sum
                    }
                  },
                  "connections"
                )}
              </React.Fragment>
            ))
          }

          {/* {pmiChart(data,`$.benchserver4.pmi.io.worker[*]`,
            {
              "httpWorker":"$.data.result[?( @.address[1].worker==\"httpWorker\")].result['busy-task-thread-count']",
              // "httpWorker.max":"$.data.result[?( @.address[1].worker==\"httpWorker\")].result['max-pool-size']",
              // "wsWorker":"$.data.result[?( @.address[1].worker==\"wsWorker\")].result['busy-task-thread-count']",
              // "ejbWorker":"$.data.result[?( @.address[1].worker==\"ejbWorker\")].result['busy-task-thread-count']",
              // "vehicleWorker":"$.data.result[?( @.address[1].worker==\"vehicleWorker\")].result['busy-task-thread-count']",
              // "insProviderWorker":"$.data.result[?( @.address[1].worker==\"insProviderWorker\")].result['busy-task-thread-count']",
              // "supplierWorker":"$.data.result[?( @.address[1].worker==\"supplierWorker\")].result['busy-task-thread-count']",
              // "connections":(entry,index,all)=>{
              //   const sum = jsonpath.query(entry,"$.data.result[?( @.address[1].worker==\"httpWorker\")].result.server[*]['connection-count']").reduce((a,b)=>a+b,0)
              //   return sum
              // }
            }
          )} */}
          {driverTables}
        </div>
      </div>
    </div>
  );
}

export default Web;
