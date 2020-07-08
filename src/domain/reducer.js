import jsonpath from 'jsonpath';


export const DEFAULT_DOMAINKEY = "__domainValue"

/**
 * combines the name and key to form the unique key for the entry
 * @param {*} name 
 * @param {*} key 
 */
export const getKey = (name,key)=>[name,key].filter(v=>v !== "").join("-")

/**
 * applies a selector to the data with optional index and all function arguments if selector is a function
 * @param {*} selector object key, jsonpath, or function(data,index,dataset)
 * @param {*} data 
 * @param {*} index 
 * @param {*} all 
 * @param {*} config 
 */
export const apply = (selector,data,index,all,config = {defaultValue:undefined,method:'query',args:[]})=>{
    const {defaultValue=undefined,method='query',args=[]} = config;
    if(typeof data === "undefined"){
        return defaultValue
    }
    let rtrn = defaultValue
    if(typeof selector === "string"){
        if(data.hasOwnProperty(selector)){
            rtrn = data[selector]
        }else if (selector.startsWith("$")){
            try{
            rtrn = jsonpath[method].call(jsonpath,data,selector);
            }catch(e){
                console.error("jsonpath",method,selector,e)
                rtrn = defaultValue
            }
            if(Array.isArray(rtrn) && rtrn.length ===0){
                rtrn = defaultValue;
            }
        }       
    }else if ( typeof selector === "function"){
        try{
        rtrn = selector(data,index,all,...args)
        }catch(e){
            console.error("selector",selector,e)
            rtrn = defaultValue
        }
    }else{
        if(data.hasOwnProperty(selector)){
            rtrn = data[selector]
        }else{
            console.log("cannot apply selector type ",typeof selector,selector)
        }
    }
    return rtrn;
}

/**
 * Merge things together to meet the charting needs
 * @param {*} dataset an array where each entry is a set of data
 * @param {*} selectors object with {name: selector} where selector is jsonpath query, keyName, or function(data,dataIndex,dataset)
 * @param {*} config ... 
 * @param {*} domainKey String key for the merged data entry (default is __domainValue)
 * @param {*} getName  return a name for the entry in the dataset
 * @param {*} getSeries gets a series of data from each entry in the dataSet 
 * getName and getSeries could be mapped to data then used for multiple sets of {getDomain,selectors} 
 * @param {*} getDomain return the domain value for entry in the getSeries result. 
 *      Arrays will add the same selector values at multiple domainKeys, be mindful of order!
 */
const reducer = (dataset,selectors={},config = {getName:(v,i,a)=>i,getSeries:(v,i,a)=>Array.isArray(v) ? v : [v],getDomain:(v,i,a)=>i,domainKey:DEFAULT_DOMAINKEY,method:'value',sort:true})=>{
    const keyOrder=[]
    const rtrn = {}
    const {getName=(v,i,a)=>i,getSeries=(v,i,a)=>Array.isArray(v) ? v : [v],getDomain=(v,i,a)=>i,domainKey=DEFAULT_DOMAINKEY,method="value",sort=true} = config;
    const domainAccessors = Array.isArray(getDomain) ? getDomain : [getDomain]
    dataset.forEach((datum,datumIndex)=>{
        const datumName = getName(datum,datumIndex,dataset);
        let series = apply(getSeries,datum,datumIndex,dataset,{defaultValue:[],method:method})
        if(!Array.isArray(series)){
            series = [series]
        }
        series.forEach((entry,entryIndex)=>{
            const domainValues = domainAccessors.map(accessor=>apply(accessor,entry,entryIndex,series,{defaultValue:[],method:'value',args:[datum]}))
            if(!sort){
                domainValues.forEach(domainValue=>{
                    if(!rtrn.hasOwnProperty(domainValue)){
                        keyOrder.push(domainValue)
                    }
                })
            }
            const rtrnEntries = domainValues.map(domainValue=> (rtrn[domainValue] || {[domainKey]:domainValue}))
            //TODO this can probably be outside of the series.forEach iteration
            const selectorArray = Array.isArray(selectors) ? selectors: Object.entries(selectors).map(selectorEntry=>{
                const [selectorName,selectorValue]=selectorEntry
                return {
                    name:selectorName,
                    accessor:selectorValue
                }
            })
            if(selectorArray.length==0){
                rtrnEntries.forEach(rtrnEntry=>{
                    rtrnEntry[getKey(datumName,"")] = entry
                })
            }
            selectorArray.forEach((selector,selectorIndex)=>{
                const {name,accessor,id=false}=selector;
                rtrnEntries.forEach(rtrnEntry=>{
                    let nameValue = typeof name === "function" ? name(entry,entryIndex,series,rtrnEntry,datum) : (name || id);
                    //apply(name,entry,entryIndex,series,{defaultValue:name,method:'value',args:[rtrnEntry,datumName]})
                    const useAccessor = accessor || id || name;
                    const accessorValue = apply(useAccessor,entry,entryIndex,series,{defaultValue:name,method:'value',args:[rtrnEntry,datum]})
                    if(typeof accessorValue !== "undefined"){
                        rtrnEntry[getKey(datumName,nameValue)] = accessorValue
                    }
                })
            })
            // this old method requires { name: accessor} but now name can also be function!, all the functions!
            // Object.keys(selectors).forEach((selectorName,selectorIndex)=>{
            //     const selector = selectors[selectorName]
            //     rtrnEntries.forEach(rtrnEntry=>{
            //         const selectorValue = apply(selector,entry,entryIndex,series,{defaultValue:undefined,method:'value',args:[rtrnEntry]})
            //         if(typeof selectorValue !== "undefined"){
            //             rtrnEntry[getKey(datumName,selectorName)] = selectorValue
            //         }
            //     })            
            // })
            rtrnEntries.forEach(entry=>{
                rtrn[entry[domainKey]] = entry;
            })
        })
    })
    if(sort){
        if(typeof sort === "function"){
            return Object.values(rtrn).sort(sort)
        }else if (typeof sort === "string"){
            return Object.values(rtrn).sort((a,b)=>a[sort]-b[sort])
        }else{
            return Object.values(rtrn).sort((a,b)=>a[domainKey]-b[domainKey])
        }
    }else{
        return keyOrder.map(key=>rtrn[key])
    }
}
export default reducer;