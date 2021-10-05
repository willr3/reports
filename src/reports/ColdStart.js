import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsonpath from 'jsonpath';
import { DateTime } from 'luxon'
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
const curlToMs = (v, defaultValue = NaN) => {
    const x = /([0-9]+)m([0-9]+\.[0-9]{3})s/.exec(v)
    if (x) {
        return 1000 * (x[1] * 60 + x[2])
    } else {
        return defaultValue
    }
}
const getDataName = (v) => v.name;

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

function ColdStart() {
    const location = useLocation();
    const [data, setData] = useState([])
    console.log("data", data)
    useEffect(
        fetchSearch("coldStart", location.search, setData)
        , [location.search, setData])

    const times = useMemo(() => {
        return data.map((datum) => {
            return {
                name: getDataName(datum),
                times: jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real) / 1000)
            }
        })

    }, [data])

    const getReal = (datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real))

    const stats = reducer(
        data,
        {
            value: (entry, index, all, rtrn) => {
                return entry[rtrn.__domainValue]
            }
        },
        {
            getSeries: getStats(getReal),
            getName: getDataName,
            getDomain: [() => "totalCount", () => "min", () => "max", () => "mean", () => 50.000, () => 90, () => 99, () => 99.9, () => 99.99, () => 99.999],
            sort: false
        }
    )
    return (
        <>
            <Helmet>
                <title>ColdStart {data.map(getDataName).join(" ")}</title>
            </Helmet>
            <div className="pf-c-content">
                <div className="pf-c-card">
                    <div className="pf-c-card__body" style={{ paddingBottom: '100px', borderBottom: 'none', display: 'flex', flexDirection: 'column', '&&after': { content: ' ', padding: '1em' } }}>
                        <h1>Serverless Scale from Zero Testing</h1>
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
                                <div style={{ pageBreakInside: 'avoid', breakAfter: 'page'  }}>
                                    <ChartContainer title={<>curl statistics</>}>
                                        {createTable(
                                            stats,
                                            data.map(getDataName),
                                            "stat"
                                        )}

                                    </ChartContainer>
                                </div>
                                <div style={{ breakInside: 'avoid' }}>
                                    <ChartContainer 
                                        title={<>curl histogram</>} 
                                        leftLabel="count" 
                                        domainLabel="seconds" 
                                        labels={data.length > 1 ? data.reduce((rtrn, datum, datumIndex) => {
                                            rtrn[datum.name] = colors[colorNames[datumIndex]][2]
                                            return rtrn;
                                        }, {}) : false}
                                    >
                                        {Charts.histo(
                                            data,
                                            (datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => {
                                                return curlToMs(v.real) / 1000
                                            }),
                                            "seconds",
                                            data.length > 1 ? getDataName : () => "curl",
                                            {
                                                domain: ['auto', 'auto'],
                                                decimals: 1,

                                            }

                                        )
                                        }
                                    </ChartContainer>
                                </div>
                                <div style={{ breakInside: 'avoid'}}>
                                    <ChartContainer 
                                        title={<>curl cumulative distribution</>} 
                                        leftLabel="percentile" 
                                        domainLabel="seconds" 
                                        labels={data.length > 1 ? data.reduce((rtrn, datum, datumIndex) => {
                                            rtrn[datum.name] = colors[colorNames[datumIndex]][2]
                                            return rtrn;
                                        }, {}) : false}
                                    >

                                        {Charts.cdf(
                                            data,
                                            (datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real) / 1000),
                                            "seconds",
                                            data.length > 1 ? getDataName : () => "curl",
                                            {
                                                domain: ['auto', 'auto'],
                                                decimals: 1,
                                            }
                                        )}

                                    </ChartContainer>
                                </div>
                            </React.Fragment>
                        ) : null}
                    </div>
                </div>
            </div>
        </>
    )
}
export default ColdStart;