import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from "react-dom";
import {
    Button
} from '@patternfly/react-core';
import {
    ThIcon,
    CaretDownIcon,
    CopyIcon,
    DownloadIcon,
    EditIcon
} from '@patternfly/react-icons';
import { chartColors } from '../theme';

import htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';

import './ChartContainer.css';

import CaptureContainer from './CaptureContainer';

const LegendEntry = ({ name, color,...spread }) => (
    <div className="legend-entry" {...spread}>
        <div className="legend-icon" style={{ backgroundColor: color, borderColor: color }} />
        <div className="legend-text">{name}</div>
    </div>
)

export default ({
    title = undefined,
    leftLabel = undefined,
    rightLabel = undefined,
    domainLabel = undefined,
    labels = {},
    style = { backgroundColor: '#ffffff' },
    children
}) => {
    const fixedStyle = { }
    return (
        <CaptureContainer name={title || "chart"}>
            <div className="panel-container" style={fixedStyle}>

                <div className="panel-header" style={fixedStyle}>
                    <div style={{  }}>
                        <h3>{title}</h3>
                        {/* <CaretDownIcon/> */}
                    </div>
                </div>

                <div className="panel-content" style={fixedStyle}>
                    <div className="chart-container" style={fixedStyle} >
                        {leftLabel ? (
                            <div className="left-container" style={fixedStyle}>
                                <div className="left-label" style={fixedStyle}>
                                    {leftLabel}
                                </div>
                            </div>
                        ) : null}
                        <div className="chart-content" style={{ flexGrow: 1 }}>
                            {children}
                        </div>
                        {rightLabel ? (
                            <div className="right-container" style={fixedStyle}>
                                <div className="right-label" style={{ fixedStyle }}>
                                    {rightLabel}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="panel-footer" style={fixedStyle}>
                    {domainLabel ? (<div style={{ textAlign: 'center' }}>{domainLabel}</div>) : null}
                    <div className="legend">
                        {Object.entries(labels).map(([name, color]) => (<LegendEntry name={name} key={name} color={color} />))}
                    </div>
                </div>
            </div>
        </CaptureContainer>
    )
}