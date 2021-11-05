import * as hdr from "hdr-histogram-js"
import reducer, {apply} from './reducer';
import jsonpath from 'jsonpath';

/**
 * calculates the percent difference of jsopath value in two datasets
 * @param {*} a first dataset
 * @param {*} b second dataset
 * @param {*} path jsonpath to value in dataset a and b
 */
export const percentDiff = (a, b, path) => {
    const v1 = (jsonpath.query(a, path) || [NaN])[0]
    const v2 = (jsonpath.query(b, path) || [NaN])[0]
    const rtrn = (v1 - v2) / ((v1 + v2) / 2) * 100
    return Number.isNaN(rtrn) ? "" : Number(rtrn).toFixed(3) + "%";
  }
  

/**
 * assumes all is sorted by getDomain
 * @param {*} all 
 * @param {*} index 
 * @param {*} getDomain 
 * @param {*} key 
 */
export const linearEstimate = (all, index, getDomain = (v) => v.__domainValue, key = "value") => {
    if (all[index].hasOwnProperty(key)) {
        return all[index][key]
    } else {
        let lessThanIndex = index - 1;
        let moreThanIndex = index + 1;
        while (lessThanIndex > 0 && !all[lessThanIndex].hasOwnProperty(key)) {
            lessThanIndex--;
        }
        while (moreThanIndex < all.length - 1 && !all[moreThanIndex].hasOwnProperty(key)) {
            moreThanIndex++;
        }
        if (lessThanIndex < 0 || moreThanIndex > all.length - 1 || !all[lessThanIndex].hasOwnProperty(key) || !all[moreThanIndex].hasOwnProperty(key)) {
            return undefined;
        }
        const deltaValue = all[moreThanIndex][key] - all[lessThanIndex][key]
        const deltaDomain = getDomain(all[moreThanIndex]) - getDomain(all[lessThanIndex])
        const slope = (deltaValue) / (deltaDomain);

        const domainDiff = getDomain(all[index]) - getDomain(all[lessThanIndex])
        const estimate = all[lessThanIndex][key] + slope * domainDiff;
        return estimate;
    }
}
const findNearestIndex = (value, all, key, getDomain = (v, i, a) => v.__domainValue, onMiss = Math.min) => {
    let start = 0, end = all.length - 1;
    while (start <= end) {
        let mid = Math.floor((start + end) / 2)
        const midValue = getDomain(all[mid], mid, all)
        if (midValue == value) {
            return mid
        } else if (midValue < value) {
            start = mid + 1
        } else {
            end = mid - 1;
        }
    }
    return onMiss(start, end);
}

export const getKolmogorovSmirnov = (data, accessor, getName=(v)=>v.name,decimals=0,hdrOpts={}) => {
    const names = data.map(getName)
    let cdf = reducer(
        data,
        {
            value: 'percentile'
        },
        {
            getSeries: getCdf(accessor, false, decimals, hdrOpts),
            getName,
            getDomain: "value"
        }
    )
    cdf.sort((a, b) => a.__domainValue - b.__domainValue);// is this necessary after initial reducer?
    cdf = cdf.map((entry, entryIndex, allEntries) => {
        const rtrn = { __domainValue: entry.__domainValue }
        const baseKey = `${names[0]}-value`
        names.forEach((name, index, all) => {
            if (index > 0) {
                const key = `${name}-value`
                rtrn[key] = linearEstimate(allEntries, entryIndex, v => v.__domainValue, key) -
                    linearEstimate(allEntries, entryIndex, v => v.__domainValue, baseKey);
            }
        })
        return rtrn;
    }).filter(e => Object.values(e).reduce((rtrn, v) => rtrn && !Number.isNaN(v), true));
    cdf.sort((a, b) => a.__domainValue - b.__domainValue);
    return cdf
}
export const getCdf = (accessor,useTaylor=true,decimals=0,hdrOpts={}) => (datum,datumIndex,datasets) => {
    const scale = Math.pow(10,decimals)
    const histogram = hdr.build(hdrOpts);

    apply(accessor,datum,datumIndex,datasets,{method:'value'})
        .forEach( v=> histogram.recordValue(Math.floor(scale*v)) )

    const rtrn = []
    const iter = histogram.percentileIterator;
    iter.reset(5);//percentileTicksPerHalfDistance (default = 5)
    while(iter.hasNext()){
        const v = iter.next();
        const taylor = 1/(1-v.percentileLevelIteratedTo/100)
        if(!useTaylor || taylor < Number.MAX_SAFE_INTEGER){
            const entry = {
                value:v.valueIteratedTo/scale,//v.valueIteratedTo,histogram.medianEquivalentValue(v.valueIteratedTo)
                percentile:v.percentileLevelIteratedTo/100,                
                sum:v.totalCountToThisValue/scale,
                count:v.countAtValueIteratedTo,
            }
            if(useTaylor){
                entry.taylor = taylor;
            }
            rtrn.push(entry)
        }else{
            console.log("too high for percentile",v.percentileLevelIteratedTo/100)
        }
        
    }
    rtrn.sort((a,b)=>a.taylor-b.taylor)
    return rtrn;
}
export const getBuckets = (accessor,decimals=0,hdrOpts={}) => (datum,datumIndex,datasets) => {
    const histogram = hdr.build(hdrOpts);
    const scale = Math.pow(10,decimals)
    apply(accessor,datum,datumIndex,datasets,{method:'value'})
        .forEach( v=> histogram.recordValue(Math.floor(scale*v)) )

    const rtrn = []
    const iter = histogram.recordedValuesIterator;
    iter.reset()
    while(iter.hasNext()){
        const v = iter.next();
        rtrn.push({
            count:v.countAtValueIteratedTo,
            to:v.valueIteratedTo/scale,
            from:v.valueIteratedFrom/scale
        })
    }
    return rtrn;
}
export const getStats = (accessor,config = {percentiles:[50,90,95,99,99.9,99.99,99.999],decimals:0,hdrOpts:{}}) => (datum,datumIndex,datasets) => {
    const {percentiles=[50,90,95,99,99.9,99.99,99.999],decimals=0,hdrOpts={}} = config;
    const scale = Math.pow(10,decimals)
    const histogram = hdr.build(hdrOpts);
    apply(accessor,datum,datumIndex,datasets,{method:'value'})
        .forEach( v=> histogram.recordValue(Math.floor(scale*v)) )
    const rtrn = {}    
    rtrn.min = histogram.minNonZeroValue/scale
    rtrn.max = histogram.maxValue/scale
    rtrn.mean = histogram.getMean()/scale
    rtrn.buckets = histogram.bucketCount
    rtrn.subBuckets = histogram.subBucketCount
    rtrn.totalCount = histogram.getTotalCount()
    percentiles.forEach(percentile=>{
        rtrn[`${percentile}`]=histogram.getValueAtPercentile(percentile)/scale
    })
    return rtrn
}