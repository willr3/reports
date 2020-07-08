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


function Hyperfoil() {
    const location = useLocation();
    const [data, setData] = useState([])
    const getDataName = (v, i, a) => {
        return data[i].name
    }
    console.log("data", data)
    useEffect(
        fetchSearch("hyperfoil", location.search, setData)
        , [location.search, setData])

    const forks = [...new Set(data.length == 0 ? [] : data[0].data.hyperfoil.stats.map(v => (v.fork)))]

    const detailsSelectors = [
        { id: '99.9', name: (v, i, a, x) => `${v.name}_99.9`, accessor: `$.percentileResponseTime["99.9"]` },
        { id: '99.0', name: (v, i, a, x) => `${v.name}_99.0`, accessor: `$.percentileResponseTime["99.0"]` },
        { id: '90.0', name: (v, i, a, x) => `${v.name}_90.0`, accessor: `$.percentileResponseTime["90.0"]` },
        { id: '50.0', name: (v, i, a, x) => `${v.name}_50.0`, accessor: `$.percentileResponseTime["50.0"]` },
        {
            id: 'Mean',
            name: (v, i, a, x, y) => {
                return `${v.name}_Mean`
            },
            accessor: `$.meanResponseTime`

        },
        {
            id: 'rps', name: (v, i, a, x) => `${v.name}_rps`, accessor: (v) => {
                return (v.requestCount / ((v.endTime - v.startTime) / 1000))
            },
            axis: 'right'
        }
    ]

    const detailsData = reducer(
        data,
        detailsSelectors,
        {
            getName: getDataName,
            getSeries: (d, i, a) => {
                const found = jsonpath.query(d, `$.data.hyperfoil.stats[*]`).flatMap((stat, statIndex) => {
                    return (stat.series || []).map((series, seriesIndex) => ({
                        ...series,
                        name: stat.total.phase + "_" + stat.total.metric
                    }))
                })
                return found;
            },
            //method: 'query',
            getDomain: [`$.startTime`, `$.endTime`]
        }
    )
    const summarySelectors = [
        { id: '99.9', name: (v, i, a, x) => `${v.phase}_${v.metric}_99.9`, accessor: `$.summary.percentileResponseTime["99.9"]` },
        { id: '99.0', name: (v, i, a, x) => `${v.phase}_${v.metric}_99.0`, accessor: `$.summary.percentileResponseTime["99.0"]` },
        { id: '90.0', name: (v, i, a, x) => `${v.phase}_${v.metric}_90.0`, accessor: `$.summary.percentileResponseTime["90.0"]` },
        { id: '50.0', name: (v, i, a, x) => `${v.phase}_${v.metric}_50.0`, accessor: `$.summary.percentileResponseTime["50.0"]` },
        { id: 'Mean', name: (v, i, a, x) => `${v.phase}_${v.metric}_Mean`, accessor: `$.summary.meanResponseTime` },
        {
            id: 'rps', name: (v, i, a, x) => `${v.phase}_${v.metric}_rps`, accessor: (v) => {
                return (v.summary.requestCount / ((v.end - v.start) / 1000))
            },
            axis: 'right'
        }
    ];
    const leftSummaryIds = summarySelectors.filter(v => !v.hasOwnProperty("axis") || v.axis !== "right").map(s => s.id)
    const rightSummaryIds = summarySelectors.filter(v => v.hasOwnProperty("axis") && v.axis == "right").map(s => s.id)

    const summaryData = reducer(
        data,//.map(datum=>jsonpath.query(datum,`$.data.hyperfoil.stats[*].total`)),
        summarySelectors,
        {
            getName: getDataName,
            getSeries: `$.data.hyperfoil.stats[*].total`,
            method: 'query',
            getDomain: [`$.start`, `$.end`, (v) => (Math.round(v.end / 2 + v.start / 2))]
        }
    )



    //returns based on summary data
    return data.length === 0 ? (<div>Loading</div>) : (
        <>
            <Helmet><title>Hyperfoil {data.map(getDataName).join(" ")}</title></Helmet>
            {
                forks.map((forkName, forkIndex) => {
                    const metrics = [...new Set(data.length == 0 ? [] : data[0].data.hyperfoil.stats.filter(v => v.fork === forkName).map(v => (v.metric)))]
                    return metrics.flatMap((metricName, metricIndex) => {
                        const phaseNames = data[0].data.hyperfoil.stats.filter(v => v.fork == forkName && v.metric == metricName).map(v => v.total.phase)
                        return (
                            <React.Fragment key={`${forkName}.${metricName}`}>
                                <h2>{`${forkName} ${metricName}`}</h2>
                                <ChartContainer 
                                    title="Summary" 
                                    leftLabel="ms"
                                    rightLabel="requests per second"
                                    labels={
                                        phaseNames.reduce((rtrn, phase, phaseIndex) => {
                                            rtrn[phase] = chartColors[phaseIndex % chartColors.length]
                                            return rtrn;
                                        },{})
                                    }
                                >
                                    <ResponsiveContainer width="100%" height={360}>
                                        <ComposedChart
                                            data={detailsData} //summaryData or detailsData works
                                            style={{ userSelect: 'none' }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <Tooltip
                                                formatter={(e) => Number(e).toFixed(0)}
                                                labelFormatter={(v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")}
                                            />
                                            {/* <Legend align="left" payload={phaseNames.map((name, index) => ({
                                            color: colors[colorNames[index % colorNames.length]][0],
                                            fill: colors[colorNames[index % colorNames.length]][0],
                                            type: 'rect',
                                            value: name
                                        }))} /> */}
                                            <XAxis
                                                allowDataOverflow={true}
                                                type="number"
                                                scale="time"
                                                dataKey="__domainValue"
                                                domain={['auto', 'auto']}
                                                tickFormatter={(v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")}
                                            />
                                            <YAxis
                                                yAxisId={0}
                                                orientation="left"
                                                tickFormatter={(v)=> Number(v/1000000).toFixed(0)}
                                                allowDataOverflow={true}
                                                domain={['auto', 'auto']}
                                            >
                                                {/* <Label value="milliseconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                                            </YAxis>
                                            {rightSummaryIds.length > 0 ? (<YAxis
                                                yAxisId={1}
                                                orientation="right"
                                                allowDataOverflow={true}
                                                domain={['auto', 'auto']}
                                            >
                                                {/* <Label value="milliseconds" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                                            </YAxis>) : null}
                                            {
                                                phaseNames
                                                    .flatMap((phaseName, phaseNameIndex) => {
                                                        const pallet = colors[colorNames[phaseNameIndex % colorNames.length]]
                                                        const dataName = getDataName(data[0], 0, data)
                                                        return leftSummaryIds.map((selectorName, selectorIndex) => {
                                                            return (
                                                                <Area
                                                                    key={`${dataName}-${phaseName}_${metricName}_${selectorName}`}
                                                                    dataKey={`${dataName}-${phaseName}_${metricName}_${selectorName}`}
                                                                    name={selectorName}
                                                                    yAxisId={0}
                                                                    unit="ns"
                                                                    stroke={pallet[selectorIndex % pallet.length]}
                                                                    fill={pallet[selectorIndex % pallet.length]}
                                                                    cursor={"pointer"}
                                                                    connectNulls
                                                                    type="monotone"
                                                                    isAnimationActive={false}
                                                                />
                                                            )
                                                        })

                                                    })
                                            }{
                                                phaseNames
                                                    .flatMap((phaseName, phaseNameIndex) => {
                                                        const dataName = getDataName(data[0], 0, data)
                                                        return rightSummaryIds.map((selectorName, selectorIndex) => {
                                                            return (
                                                                <Line
                                                                    key={`${dataName}-${phaseName}_${metricName}_${selectorName}`}
                                                                    dataKey={`${dataName}-${phaseName}_${metricName}_${selectorName}`}
                                                                    name={selectorName}
                                                                    yAxisId={1}
                                                                    stroke="red"
                                                                    fill="red"
                                                                    connectNulls={true}
                                                                    dot={false}
                                                                    isAnimationActive={false}
                                                                    style={{ strokeWidth: 1 }}
                                                                />
                                                            )
                                                        })
                                                    })
                                            }
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </React.Fragment>
                        )
                    })
                })
            }


        </>
    )
}

export default Hyperfoil;