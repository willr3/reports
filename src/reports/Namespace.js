import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsonpath from 'jsonpath';
import { DateTime } from 'luxon'
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
import * as Charts from '../domain/charts';
import { fetchSearch } from '../redux/actions';

import ChartContainer from '../components/ChartContainer';
import { chartColors } from '../theme';
import CaptureContainer from '../components/CaptureContainer';

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

const formatCell = (data, { precision = 3 }) => {
    if (!Number.isNaN(data)) {
        if (Number.isInteger(data)) {
            return data
        } else {
            return Number(data).toFixed(precision)
        }
    } else {
        return data
    }
}
const createTable = (mergedData, names = [], header = "", config = { precision: 3 }) => {
    return (
        <table className="pf-c-table pf-m-compact pf-m-grid-md">
            <thead>
                <tr>
                    <th>{header}</th>
                    {names.map((name, index) => (<th key={index}>{name}</th>))}
                </tr>
            </thead>
            <tbody>
                {mergedData.map((entry, index, all) => (
                    <tr key={index}>
                        <th>{entry["__domainValue"]}</th>
                        {names.map((name, i) => (<td key={i}>{formatCell(entry[`${name}-value`], config)}</td>))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
const namespaceTimes = (datum, dataIndex, datasets) => datum.data.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
    .filter(timer =>
        timer.name.startsWith("Sh-await-callback") &&
        timer.name.includes("kind: Namespace")
    )
    .map((timer, index) => ({ ...timer, index }))

const serviceTimes = (datum, dataIndex, datasets) => datum.data.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
    .filter(timer =>
        timer.name.startsWith("Sh-await-callback") &&
        timer.name.includes("serving.knative.dev/v1alpha1")
    )
    .map((timer, index) => ({ ...timer, index }))

const reportSeries = (name, getSeries, valueKey, getName = (v) => v.name, data) => {
    console.log("name", name)
    const getValues = (v, i, a) => apply(getSeries, v, i, a).map(v => v[valueKey] / 1000)
    const stats = reducer(
        data,
        {
            value: (entry, index, all, rtrn) => {
                return entry[rtrn.__domainValue]
            }
        },
        {
            getSeries: getStats(getValues, { decimals: 2 }),
            getName: (datum, dataIndex, datasets) => datum.name,
            getDomain: [() => "totalCount", () => "min", () => "max", () => "mean", () => 50.000, () => 90, () => 99, () => 99.9, () => 99.99, () => 99.999]
        }
    )
    const statDomain = [0, Math.max.apply(
        Math,
        Object.entries(jsonpath.value(stats, "$[?(@.__domainValue == 'max')]") || {})
            .filter(v => v[0] !== "__domainValue")
            .map(v => v[1])
    )]
    console.log("domain", statDomain)
    return (
        <React.Fragment>
            <div style={{ pageBreakInside: 'avoid' }}>
                <h3>{`${name} statistics`}</h3>
                {createTable(
                    reducer(
                        data,
                        {
                            value: (entry, index, all, rtrn) => {
                                return entry[rtrn.__domainValue]
                            }
                        },
                        {
                            getSeries: getStats(getValues, { decimals: 3 }),
                            getName,
                            getDomain: [() => "totalCount", () => "min", () => "max", () => "mean", () => 50.000, () => 90, () => 99, () => 99.9, () => 99.99, () => 99.999],
                            sort: false
                        }
                    ),
                    data.map(datum => datum.name),
                    "stat"
                )}
            </div>
            <div style={{ pageBreakInside: 'avoid' }}>
                <ChartContainer
                    title={<h3>{`${name} samples`}</h3>}
                    leftLabel="seconds"
                    domainLabel="services"
                    labels={data.reduce((rtrn, datum, datumIndex) => {
                        rtrn[getName(datum, datumIndex, data)] = chartColors[datumIndex % chartColors.length]
                        return rtrn;
                    }, {})}
                >
                    <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart
                            data={reducer(
                                data,
                                {
                                    oc: 'millis'
                                },
                                {
                                    getName,
                                    getSeries,
                                    getDomain: (entry, entryIndex, series) => entry.index,
                                }
                            )}
                            style={{ userSelect: 'none' }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip
                                formatter={(v) => v / 1000}
                            />
                            <XAxis
                                allowDataOverflow={true}
                                type="number"
                                scale="linear"
                                dataKey="__domainValue"
                                domain={['auto', 'auto']}
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
                            {/* <Legend align="left" /> */}
                            <YAxis
                                allowDataOverflow={true}
                                domain={[0, 'auto']}
                                tickFormatter={(v) => (v / 1000)}
                            >
                                {/* <Label value="seconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                            </YAxis>
                            {data.map((datum, datumIndex, datasets) => (
                                <Line
                                    key={`${datum.name}-oc`}
                                    yAxisId={0}
                                    name={`${datum.name}`}
                                    dataKey={`${datum.name}-oc`}
                                    stroke={colors[colorNames[datumIndex]][1]}
                                    fill={colors[colorNames[datumIndex]][1]}
                                    connectNulls={true}
                                    dot={false}
                                    isAnimationActive={false}
                                    style={{ strokeWidth: 2 }}
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
            <div style={{ pageBreakInside: 'avoid' }}>
                <ChartContainer
                    title={<h3>{`${name} histogram`}</h3>}
                    leftLabel="count"
                    domainLabel="seconds"
                    labels={data.reduce((rtrn, datum, datumIndex) => {
                        rtrn[getName(datum, datumIndex, data)] = chartColors[datumIndex % chartColors.length]
                        return rtrn;
                    }, {})}
                >
                    {Charts.histo(
                        data,
                        getValues,
                        "seconds",
                        getName,
                        {
                            domain: statDomain,
                            decimals: 1,
                        }
                    )}
                </ChartContainer>
            </div>
            <div style={{ pageBreakInside: 'avoid' }}>
                <ChartContainer
                    title={<h3>{`${name} cumulative distribution`}</h3>}
                    leftLabel="count"
                    domainLabel="seconds"
                    labels={data.reduce((rtrn, datum, datumIndex) => {
                        rtrn[getName(datum, datumIndex, data)] = chartColors[datumIndex % chartColors.length]
                        return rtrn;
                    }, {})}
                >
                    {Charts.cdf(
                        data,
                        getValues,
                        "seconds",
                        getName,
                        {
                            domain: statDomain,
                            decimals: 2,
                        }
                    )}
                </ChartContainer>
            </div>
            {/* <div style={{ pageBreakInside: 'avoid' }}>
                <h3>Kolmogorov Smirnov</h3>
                {Charts.kolmogorovSmirnov(
                    data,
                    getValues,
                    "milliseconds",
                    getName,
                    {
                        domain
                    }
                )}
            </div>
            <div style={{ pageBreakInside: 'avoid' }}>
                <h3>Taylor 1/(1-x)</h3>
                {Charts.taylor(
                    data,
                    getValues,
                    "milliseconds",
                    getName
                )}
            </div> */}
        </React.Fragment>
    )
}
const getDataName = (v) => v.name;
function Namespace() {
    const location = useLocation();
    const [data, setData] = useState([])
    console.log("data", data)
    useEffect(
        fetchSearch("createNamespace", location.search, setData)
        , [location.search, setData])
    // const stats = useMemo(() => {
    //     return reducer(
    //         data,
    //         {
    //             value: (entry, index, all, rtrn) => {
    //                 return entry[rtrn.__domainValue]
    //             }
    //         },
    //         {
    //             getSeries: getStats(createNamespaceTimes),
    //             getName: getDataName,
    //             getDomain: [() => "totalCount", () => "min", () => "max", () => "mean", () => 50.000, () => 90, () => 99, () => 99.9, () => 99.99, () => 99.999]
    //         }
    //     )
    // }, [data])
    // const domain = [0, Math.max.apply(
    //     Math,
    //     Object.entries(jsonpath.value(stats, "$[?(@.__domainValue == 'max')]") || {})
    //         .filter(v => v[0] !== "__domainValue")
    //         .map(v => v[1])
    // )]

    return (
        <>
            <Helmet><title>Namespace {data.map(getDataName).join(" ")}</title></Helmet>
            <div className="pf-c-content">
                <div className="pf-c-card">
                    <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none' }}>
                        <h1>Serverless Namespace Count Testing</h1>
                        {data.length > 0 ? (
                            <React.Fragment>
                                <div style={{ pageBreakInside: 'avoid' }}>
                                    <h3>Operators</h3>
                                    <table className="pf-c-table pf-m-compact pf-m-grid-md">
                                        <thead>
                                            <tr>
                                                <th>Operator</th>
                                                {data.map((datum, datumIndex) => (<th key={datumIndex}>{datum.name}</th>))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reducer(
                                                data,
                                                {
                                                    version: '$.status.currentCSV'
                                                },
                                                {
                                                    getName: (datum, datumIndex, datasets) => datum.name,
                                                    getSeries: '$.data.oc.operators.items',
                                                    getDomain: '$.spec.name',
                                                }
                                            ).map((operator, operatorIndex) => (
                                                <tr key={operatorIndex}>
                                                    <th>{operator.__domainValue}</th>
                                                    {data.map((datum, datumIndex) => {
                                                        const name = datum.name;
                                                        return <td key={datumIndex}>{operator[`${name}-version`]}</td>
                                                    })}
                                                </tr>
                                            ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                                {reportSeries("Namespace", namespaceTimes, "millis", getDataName, data)}
                                {reportSeries("Service", serviceTimes, "millis", getDataName, data)}
                                {reportSeries("Ready ksvc",
                                    (datum, datumIndex, datasets) => datum.data.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
                                        .filter((timer,timerIndex,allTimers) =>
                                            timer.name.startsWith("Sh-await-callback") &&
                                            timer.name.includes("wait --for=condition=Ready ksvc")
                                            
                                        )
                                        .filter((timer,timerIndex,allTimers)=>
                                            timerIndex < allTimers.length-3
                                        )
                                        .map((timer, index) => ({ ...timer, index })),
                                    "millis", getDataName, data)
                                }
                            </React.Fragment>
                        ) : null}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Namespace;