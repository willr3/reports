//https://github.com/recharts/recharts/issues/275#issuecomment-386696660
import React from 'react';
import DefaultTooltipContent from 'recharts/lib/component/DefaultTooltipContent';

export default ({extra=[],data=[],dataNames=[],colors={},...props})=>{
    if (!props.payload || !props.active || props.payload.length == 0) {
        return <></>
    }

    const payloadUnits = props.payload.reduce((rtrn,payload,payloadIdx)=>{
        const name = payload.dataKey.substring(payload.dataKey.indexOf('-'))
        rtrn[name]=payload.unit
        return rtrn
    },{})
    if(props.payload[0]){
        const domainValue = props.payload[0].payload.__domainValue
        const idx = iterativeFunction(data,domainValue)
        const payloadDataKeys = props.payload.map(v=>v.dataKey.substring(v.dataKey.indexOf('-')))
        const missingDataNames = dataNames.filter(v=>!props.payload[0].dataKey.startsWith(v))
        

        const also = missingDataNames.reduce((rtrn,name)=>{
            // if(!rtrn[name]){
            //     rtrn[name]={}
            // }
            payloadDataKeys.forEach((dataKey,dataKeyIdx)=>{
                // if(!rtrn[name][dataKey]){
                //     rtrn[name][dataKey]={}
                // }
                let prevIdx = idx;
                let nextIdx = idx;
                while(data[prevIdx] && !data[prevIdx].hasOwnProperty(name+dataKey) && prevIdx>=0){
                    prevIdx--;
                }
                //rtrn[name][dataKey].prev=prevIdx
                while(data[nextIdx] && !data[nextIdx].hasOwnProperty(name+dataKey) && nextIdx<data.length){
                    nextIdx++;
                }
                if(prevIdx<0){
                    if(nextIdx < data.length){

                    }
                }else if (nextIdx == data.length){

                }else{
                    const prevDomain = data[prevIdx].__domainValue;
                    const prevValue = data[prevIdx][name+dataKey]
                    const nextDomain = data[nextIdx].__domainValue;
                    const nextValue = data[nextIdx][name+dataKey]

                    const slope = (nextValue-prevValue)/(nextDomain-prevDomain)
                    const estimate = prevValue+slope*(domainValue-prevDomain)
                    const section = dataKey.substring(dataKey.lastIndexOf('_')+1)
                    const payloadNewName = name+"-"+section;
                    const color = colors[name+dataKey]
                    rtrn[name+dataKey]=estimate
                    props.payload.push({
                        color: color,
                        stroke: color,
                        cursor: "pointer",
                        dataKey: name+dataKey,
                        fillOpactiy: 0.6,
                        name: payloadNewName,
                        value: estimate,
                        unit: payloadUnits[dataKey]
                    })
                    }
                //rtrn[name][dataKey].next=nextIdx
            })
            return rtrn;
        },{})

        extra.forEach(toAdd=>{
            if(typeof toAdd === "function"){
                props.payload.push(toAdd(props.payload[0].payload))
            }
        })
        // example of what needs to be pushed into payload
        // props.payload.push({
        //     color: "red",
        //     name: "foo",
        //     value: "bar"
        // })
    }
    props.payload.forEach((payload,index)=>{
        if(payload.unit === "ns"){
            payload.value = payload.value/1000000.0;
            payload.unit="ms";
        }
    })

    return (<DefaultTooltipContent {...props} />);
}

const iterativeFunction = function (arr, x) {
  
    let start=0, end=arr.length-1;
         
    // Iterate while start not meets end
    while (start<=end){
 
        // Find the mid index
        let mid=Math.floor((start + end)/2);
        // If element is present at mid, return True
        if (arr[mid].__domainValue===x) return mid;
 
        // Else look in left or right half accordingly
        else if (arr[mid].__domainValue < x)
             start = mid + 1;
        else
             end = mid - 1;
    }
    return false;
}