import React, { useState, useRef, useMemo, useEffect } from 'react';
import uPlot from "uplot"

import 'uplot/dist/uPlot.min.css';

const opts = {
    title: "Server Events",
    width: 1920,
    height: 600,
    //	cursor: {
    //		x: false,
    //		y: false,
    //	},
    series: [
        {},
        {
            label: "CPU",
            scale: "%",
            value: (u, v) => v == null ? "-" : v.toFixed(1) + "%",
            stroke: "red",
            width: 1 / devicePixelRatio,
        },
        {
            label: "RAM",
            scale: "%",
            spanGaps: true,
            //fill: "rgba(0,0,255,0.1)",
            value: (u, v) => v == null ? "-" : v.toFixed(1) + "%",
            stroke: "blue",
            width: 1 / devicePixelRatio,
        },
        {
            label: "TCP Out",
            scale: "mb",
            spanGaps: false,
            value: (u, v) => v == null ? "-" : v.toFixed(2) + " MB",
            stroke: "green",
            width: 1 / devicePixelRatio,
        }
    ],
    axes: [
        {},
        {
            label: "Left",
            scale: "%",
            values: (u, vals, space) => vals.map(v => +v.toFixed(1) + "%"),
        },
        {
            label: "Right",
            side: 1,
            scale: "mb",
            size: 60,
            values: (u, vals, space) => vals.map(v => +v.toFixed(2) + " MB"),
            grid: { show: false },
        },
    ],
};
const now = (new Date()).getTime()
const data = [
    [],//x
    [],//cpu
    [],//ram
    [],//tcp
]
for(let i=0; i<5000; i++){
    data[0][i]= (i > 0 ? data[0][i-1] : now) + 60 * Math.random()
    data[1][i]=100-100*Math.random()
    if(i>2000 ){
        data[2][i]=null
    }else{
        data[2][i]=100-100*Math.random()
    }
    data[3][i]=10000-10000*Math.random()
}

export default () => {

    const defaultRef = React.useRef()

    useEffect(()=>{
        new uPlot(opts,data,defaultRef.current)
    },[])
    return (
        <>
            <div>uPlot</div>
            <div ref={defaultRef}></div>
        </>
    )
}