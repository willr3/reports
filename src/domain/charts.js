import React, { useState, useEffect } from 'react';
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
//import { AutoSizer } from 'react-virtualized';
import { getCdf, getBuckets, getStats, linearEstimate, getKolmogorovSmirnov } from './stats';
import reducer, { apply } from './reducer';
import theme from '../theme';

//import ChartContainer from '../components/ChartContainer';

export const getColor = (index, subIndex) => {
    const chartName = Object.keys(theme.colors.chart)[index % Object.keys(theme.colors.chart).length]
    return theme.colors.chart[chartName][subIndex % theme.colors.chart[chartName].length]
}

const applyColor = (selector, index, subIndex) => {
    if (typeof selector === "string") {
        return selector
    } else if (Array.isArray(selector)) {
        const selected = selector[index % selector.length]
        return applyColor(selected, subIndex, 0);
    } else if (typeof selector === "function") {
        return selector(index, subIndex)
    } else {
        console.log("ERROR unknown selector", selector)
        return "black"
    }
}
export const taylor = (data, selector, unit, getName = (v, i) => i, config = { domain: [0, 'auto'], range: [0, 'auto'], colors: getColor }) => {
    const { domain = [0, 'auto'], range = [0, 'auto'], colors = getColor } = config;
    const reduced = reducer(
        data,
        {
            value: 'value',
            percentile: "percentile",
        },
        {
            getSeries: getCdf(selector),
            getName: getName,
            getDomain: "taylor"
        }
    );
    const ticks = {}
    reduced.forEach(entry => {
        const percentile = Math.max.apply(Math,
            Object.keys(entry).filter(v => v.endsWith("-percentile")).map(v => entry[v]))
        ticks[entry.__domainValue] = percentile
    })
    return (
        <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
                data={reduced}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <Legend align="left" />
                <Tooltip
                    formatter={(e) => Number(e).toFixed(0)}
                    labelFormatter={(v, a, c) => {
                        return Number(100 * ticks[v]).toFixed(3)
                    }}
                />
                <XAxis
                    allowDataOverflow={true}
                    type="number"
                    scale="linear"
                    dataKey="__domainValue"
                    domain={[0, 'auto']}
                    //ticks={[.50, .90, .95, .99, .999, .9999, .99999].map(v => 1 / (1 - v))}
                    tickFormatter={v => Number(100 * ticks[v]).toFixed(3)}
                >
                    <Label
                        value="percentile"
                        position="insideBottom"
                        angle={0}
                        offset={0}
                        textAnchor='middle'
                        style={{ textAnchor: 'middle' }}
                    />
                </XAxis>
                <YAxis
                    allowDataOverflow={true}
                    domain={[0, 'auto']}
                >
                    <Label value={unit} position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                </YAxis>
                {data.map((datum, datumIndex, datasets) => {
                    const datumName = getName(datum, datumIndex, datasets)
                    const key = `${datumName}-value`

                    return (
                        <Line
                            key={key}
                            yAxisId={0}
                            name={datumName}
                            dataKey={key}
                            stroke={applyColor(colors, datumIndex, 1)}
                            fill={applyColor(colors, datumIndex, 1)}
                            connectNulls={true}
                            dot={false}
                            isAnimationActive={false}
                            style={{ strokeWidth: 2 }}
                        />
                    )
                })}
            </ComposedChart>
        </ResponsiveContainer>
    )
}
export const cdf = (data, selector, unit, getName = (v, i) => i, config = { domain: [0, 'auto'], range: [0, 'auto'], colors: getColor, decimals: 0, hdrOpts: {} }) => {
    const { domain = [0, 'auto'], range = [0, 'auto'], colors = getColor, decimals= 0, hdrOpts= {} } = config;
    const scale = Math.pow(10,decimals)
    const reduced = reducer(
        data,
        {
            value: 'percentile',
            percentile: "percentile",
        },
        {
            getSeries: getCdf(selector, false, decimals, hdrOpts),
            getName: getName,
            getDomain: "value"
        }
    );
    reduced.sort((a, b) => a.__domainValue - b.__domainValue);
    return (
        <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
                data={reduced}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                {/* <Legend align="left" /> */}
                <Tooltip
                    formatter={(e) => Number(100 * e).toFixed(3)}
                />
                <XAxis
                    allowDataOverflow={true}
                    type="number"
                    scale="linear"
                    dataKey="__domainValue"
                    domain={domain}
                >
                    {/* <Label
                        value={unit}
                        position="insideBottom"
                        angle={0}
                        offset={0}
                        textAnchor='middle'
                        style={{ textAnchor: 'middle' }}
                    /> */}
                </XAxis>
                <YAxis
                    allowDataOverflow={true}
                    domain={range}
                    tickFormatter={e => Number(100 * e)}
                >
                    {/* <Label value="percentile" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                </YAxis>
                {data.map((datum, datumIndex, datasets) => {
                    const datumName = getName(datum, datumIndex, datasets)
                    const key = `${datumName}-value`
                    return (
                        <Line
                            key={key}
                            yAxisId={0}
                            name={datumName}
                            dataKey={key}
                            stroke={applyColor(colors, datumIndex, 1)}
                            fill={applyColor(colors, datumIndex, 1)}
                            connectNulls={true}
                            dot={false}
                            isAnimationActive={false}
                            style={{ strokeWidth: 2 }}
                        />
                    )
                }
                )}
            </ComposedChart>
        </ResponsiveContainer>
    )
}
export const kolmogorovSmirnov = (data, selector, unit, getName = (v, i) => i, config = { domain: [0, 'auto'], range: ['auto', 'auto'], colors: getColor }) => {
    const { domain = [0, 'auto'], range = [0, 'auto'], colors = getColor } = config;
    const cdf = getKolmogorovSmirnov(data, selector, getName)
    return (
        <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
                data={cdf}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <Legend align="left" />
                <Tooltip
                    formatter={(e) => Number(100 * e).toFixed(3)}
                />
                <XAxis
                    allowDataOverflow={true}
                    type="number"
                    scale="linear"
                    dataKey="__domainValue"
                    domain={domain}
                >
                    <Label
                        value={unit}
                        position="insideBottom"
                        angle={0}
                        offset={0}
                        textAnchor='middle'
                        style={{ textAnchor: 'middle' }}
                    />
                </XAxis>
                <YAxis
                    allowDataOverflow={true}
                    domain={range}
                    tickFormatter={e => Number(100 * e)}
                >
                    <Label value="Kolmogorov Smirnov" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                </YAxis>
                {data.map((datum, datumIndex, datasets) => {
                    const datumName = getName(datum, datumIndex, datasets)
                    const key = `${datumName}-value`

                    return (
                        <Line
                            key={key}
                            yAxisId={0}
                            name={datumName}
                            dataKey={key}
                            stroke={applyColor(colors, datumIndex, 1)}
                            fill={applyColor(colors, datumIndex, 1)}
                            connectNulls={true}
                            dot={true}
                            isAnimationActive={false}
                            style={{ strokeWidth: 0 }}
                        />
                    )
                })}
            </ComposedChart>
        </ResponsiveContainer>
    )
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
export const table = (data, selectors, config = { precision: 3, layout: "column", header: "info", getName: (v) => v.name }) => {
    const { precision = 3, layout = "column", header = "info", getName = (v) => v.name } = config;
    const isColumns = layout.toLowerCase().startsWith("c");//or row

    const headerRow = isColumns ? data.map(getName) : selectors.map(s => (s.header || s.name))
    return (
        <table className="pf-c-table pf-m-compact pf-m-grid-md">
            <thead>
                <tr>
                    <th>{header}</th>
                    {headerRow.map((name, index) => (<th key={index}>{name}</th>))}
                </tr>
            </thead>
            <tbody>
                {isColumns ?
                    (
                        selectors.map((s, i) => {
                            const name = (s.header || s.name)
                            const selector = s.accessor || s.name
                            return (
                                <tr key={i}>
                                    <th>{name}</th>
                                    {data.map((datum, datumIndex) => {
                                        const v = apply(selector, datum, datumIndex, data)
                                        return (<td key={datumIndex}>{formatCell(v, config)}</td>)
                                    })}
                                </tr>
                            )
                        })
                    ) : (
                        data.map((d, i) => {
                            const name = getName(d, i, data)
                            return (
                                <tr key={i}>
                                    <th>{name}</th>
                                    {selectors.map((s, sI) => {
                                        const selector = s.accessor || s.name
                                        const v = apply(selector, d, i, data)
                                        return (<td key={sI}>{formatCell(v, config)}</td>)
                                    })}
                                </tr>
                            )
                        })
                    )
                }
            </tbody>
        </table>
    )
}
export const histo = (data, selector, unit, getName = (v, i) => i, config = { domain: [0, 'auto'], range: [0, 'auto'], colors: getColor, decimals: 0, hdrOpts: {} }) => {
    const { domain = [0, 'auto'], range = [0, 'auto'], colors = getColor, decimals = 0, hdrOpts = {}} = config;
    const histo = reducer(
        data,
        {
            count: 'count'
        },
        {
            getSeries: getBuckets(selector,decimals,hdrOpts),
            getName,
            getDomain: "to"
        }
    )
    console.log("histo",histo)
    return (
        <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
                data={histo}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                {/* <Legend align="left" /> */}
                <Tooltip
                    formatter={(e) => Number(e).toFixed(0)}
                    labelFormatter={(v)=>Number(v)}
                // labelFormatter={(v, a, c) => {
                //     return Number(100 * cdfTicks[v]).toFixed(3)
                // }}
                />
                <XAxis
                    allowDataOverflow={true}
                    type="number"
                    scale="linear"
                    dataKey="__domainValue"
                    tickFormatter={(v)=>{
                        return Number(v).toFixed(decimals);
                        // console.log("hist.ticksFormatter",{v})
                        // return Number(v/1000).toFixed(1)
                    }}
                    domain={domain}
                    height={24}
                //ticks={[.50, .90, .95, .99, .999, .9999, .99999].map(v => 1 / (1 - v))}
                //tickFormatter={v => Number(100 * cdfTicks[v]).toFixed(3)}
                >
                    {/* <Label
                        value={unit}
                        position="insideBottom"
                        angle={0}
                        offset={0}
                        textAnchor='middle'
                        style={{ textAnchor: 'middle' }}
                    /> */}
                </XAxis>
                <YAxis
                    allowDataOverflow={true}
                    domain={range}
                    // width={30}
                />
                    {/* <Label value="count" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} /> */}
                {/* </YAxis> */}
                {data.map((datum, datumIndex, datasets) => {
                    const key = `${getName(datum, datumIndex, datasets)}-count`
                    return (
                        <Bar
                            key={key}
                            yAxisId={0}
                            name={`${getName(datum, datumIndex, datasets)}`}
                            dataKey={key}
                            barSize={10}
                            isAnimationActive={false}
                            dot={false}
                            stroke={applyColor(colors, datumIndex, 1)}
                            fill={applyColor(colors, datumIndex, 1)}
                            fillOpacity={0.3}
                            style={{ strokeWidth: 1 /*, strokeOpacity: 0.3*/ }}
                        />
                    )
                })}
            </ComposedChart>
        </ResponsiveContainer>
    )
}
