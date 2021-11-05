import React, { useState, useEffect, useMemo } from 'react';
//import ReactDOM from "react-dom";
import {
    Button,
    //Spinner,
    Tooltip,
} from '@patternfly/react-core';
import {
    // ThIcon,
    // CaretDownIcon,
    CopyIcon,
    DownloadIcon,
    // EditIcon
} from '@patternfly/react-icons';

import Loader from "react-spinners/ClipLoader";
import innerText from 'react-innertext';

import html2canvas from 'html2canvas';

import './CaptureContainer.css';

const ClipboardItem = window.ClipboardItem

const selectorPath = ".pf-c-card__body" //'main.pf-c-page__main'

export const getCanvas = (node, opts = {}) => {
    const scrollTop = document.querySelector(selectorPath).scrollTop
    document.querySelector(selectorPath).scrollTop = scrollTop + 10;
    return html2canvas(node, {
    ...opts,
    onclone:(doc)=>{
        const root = doc.getElementById("root");
        const main = doc.querySelector(selectorPath);
        if(main){
            main.scrollTop = scrollTop
        }
        if(root){
            root.style.height = 'auto';
            root.id = "not-root"
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, 400)
        })

    },
    //trying to fix the grey bars, no luck, damn grey bars were libreoffice bug, not capture
    // x: node.getBoundingClientRect().x,
    // y: node.getBoundingClientRect().y,
    // width: node.getBoundingClientRect().right - node.getBoundingClientRect().x + 10,
    // height: node.getBoundingClientRect().bottom - node.getBoundingClientRect().y + 10,


    //https://github.com/niklasvh/html2canvas/issues/1878#issuecomment-511678281
    scrollX: 0,
    scrollY: -window.scrollY,

})

}
const convertName = (name) =>{
    return innerText(name)
}
export const useCapture = (ref, name = "snapshot", opts = { backgroundColor: "#ffffff" }) => {
    return [
        () => {
            return getCanvas(ref.current, opts).then((canvas) => {
                var tempcanvas = document.createElement('canvas');
                // tempcanvas.width=465;
                // tempcanvas.height=524;
                var context = tempcanvas.getContext('2d');
                context.drawImage(canvas, 0, 0);
                var link = document.createElement("a");
                link.href = canvas.toDataURL('image/png');
                link.download = `${name}.png`;
                link.click();
            })
        },
        //! isFirefox https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
        // and if the clipboard is visible (requires chrome settings or https)
        !(typeof InstallTrigger !== 'undefined' && navigator && navigator.clipboard) ? 
            () => {
                if (navigator && navigator.clipboard) {
                    return getCanvas(ref.current, opts).then((canvas) => {
                        canvas.toBlob((pngBlob) => {
                            //TODO detect firefox and use different method with clipboard
                            try {
                                const newItem = [new ClipboardItem({ [pngBlob.type]: pngBlob })]
                                navigator.clipboard.write(newItem).then(
                                    () => { console.log("copied @ ", Date.now()) }, 
                                    (e) => { console.log("Error", e) }
                                );
                            } catch (error) {
                                //firefox does not support new ClipboardItem(...)

                                console.error(error);
                            }
                        }, "image/png", 1);

                    },
                        (canvasError) => {
                            console.log("Error getting canvas", canvasError)
                        })
                }else{
                    //TODO alert that clipboard is not available
                    return Promise.resolve(false)
                }
            } : false
    ]
}



export default ({
    children,
    name = "snapshot",
    style = { backgroundColor: '#ffffff' },
}) => {

    const fileName = convertName(name);
    const [rendering, setRendering] = useState(false);
    const { backgroundColor = '#ffffff' } = style
    const defaultRef = React.useRef()
    const [download, copy] = useCapture(defaultRef, fileName, { /*backgroundColor*/ });

    const newCopy = () => {
        setRendering(true)
        copy().then(() => {
            setRendering(false);
        })
    }

    const icon = rendering ? <Loader
        // css={override}
        size={16}
        color={"#06c"}
        loading={true}
    /> : <CopyIcon />
    return (
        <div className="capture-container" ref={defaultRef} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            {children}
            <span className="capture-controls" data-html2canvas-ignore={true} >
                <Tooltip content="download">
                    <Button variant="plain" aria-label="Action" onClick={download}>
                        <DownloadIcon />
                    </Button>
                </Tooltip>

                {copy ? (<Tooltip content="copy to clipboard"><Button variant="plain" aria-label="Action" onClick={newCopy}>
                    {icon}
                </Button></Tooltip>) : null}
            </span>
        </div>
    )
}