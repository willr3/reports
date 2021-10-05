import axios from 'axios';
import * as qs from 'query-string';
import * as ActionTypes from './actionTypes';

const endPoints = {
    ls: (groupId="") => `/api/ls?path=${groupId}`,
    map: () => `/api/map`,
    remove: (groupId="",name="") => `/api/data/${groupId}/${name}`
}
const encode = (accessors)=>{
    const rtrn = {}
    Object.keys(accessors).forEach(key=>{
        if(typeof accessors[key] === "function"){
            rtrn[key] = accessors[key].toString();
        }else{
            rtrn[key] = accessors[key]
        }
    })
    return rtrn;
}
export const fetchSearch = (groupId="",search="",callBack=()=>{})=>()=>{
    const q = qs.parse(search)
    const names = (q.q && Array.isArray(q.q) ? q.q : [q.q]).filter(v => v) //removes undefined
    const getIt = async () => {
        const ary = await Promise.all(
            names.map(name => {
                const file = name.includes("=") ? name.substring(0,name.indexOf("=")) : name
                const alias = name.includes("=") ? name.substring(name.indexOf("=")+1,name.length) : name
                return axios.get(`/api/data/${groupId}/${file}.json`).then(response =>(
                {
                    ...response,
                    name : alias
                }))
            }
            )
        ).then( v => v.map( d=> ({
            url: d.config.url,
            data: d.data,
            name: d.name
        })))
        callBack(ary)
    }
    getIt();
}
export const ls = (groupId="") =>
    dispatch =>
        axios.get(endPoints.ls(groupId))
        .then(
            response => {
                return Promise.resolve(response)
            },
            error => {
                return Promise.reject(error);
            }
        )
export const fetchAllGroups = () =>
    dispatch =>{
        return axios.get(endPoints.ls(""),{
            params:{
                filter:"isDirectory"
            }
        })
    }
export const deleteData = (groupId="",name="") => 
    dispatch =>{
        return axios.delete(endPoints.remove(groupId,name))
        .then(
            response => {
                
            },
            error => {
                
            }
        )
    }
export const fetchGroup = (groupId,accessors) =>
    dispatch =>{
        const toSend = encode(accessors)
        return axios.get(endPoints.ls(groupId),{
            params:{
                filter:"isFile"
            }
        })
        .then(
            response => {
                if(response.data && response.data.files){
                    console.log("have ls",response.data.files)
                    return response.data.files.map(file=>file.fullPath)
                }
            },
            error => {
                return Promise.reject(error);
            }
        ).then(files => axios.post(endPoints.map(),{
            files,
            accessors: toSend
        }))
        .then(response=>{
            if(response.data){
                dispatch({
                    type:ActionTypes.GROUP_LOADED,
                    groupId,
                    data: response.data
                })
            }
        },
        error=>{
            return Promise.reject(error)
        })
    }