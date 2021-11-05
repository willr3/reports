import reducer, {apply} from './reducer';
import jsonpath from 'jsonpath';

const DATA = [{
    one: {
        EN: "one",
        SP: "dos"
    },
    two: {
        EN: "two",
        SP: "dos"
    }    
}]
test("apply() key",()=>{
    expect(apply("one",DATA[0],0,DATA)).toEqual({EN: "one", SP: "dos"})
})
test("apply() missing key",()=>{
    expect(
        apply("missing",DATA[0],0,DATA)
    ).toEqual(undefined)
})
test("apply() jsonpath default jsonpath method",()=>{
    expect(
        apply("$.one.EN",DATA[0],0,DATA)
    ).toEqual(["one"])
})
test("apply() jsonpath.value method",()=>{
    expect(
        apply("$.one.EN",DATA[0],0,DATA,{method:'value'})
    ).toEqual("one")
})
test("apply() missing jsonpath",()=>{
    expect(
        apply("$.one.FR",DATA[0],0,DATA)
    ).toEqual(undefined)
})
test("apply() missing jsonpath.value",()=>{
    expect(
        apply("$.one.FR",DATA[0],0,DATA,{method:'value'})
    ).toEqual(undefined)
})
test("reducer() no config",()=>{
    expect(
        reducer(DATA,{"answer":"$.one.EN"})
    ).toEqual([{
        __domainValue:0,
        "0-answer":"one"
    }])
})
test("reducer() no selectors",()=>{
    expect(
        reducer(DATA,{})
    ).toEqual([{
        __domainValue: 0,
        0 : DATA[0] 
    }])
})
test("reducer() getSeries function ",()=>{
    expect(
        reducer(DATA,{answer:"$.EN"},{getSeries:(v,i,a)=>Object.values(v)})
    ).toEqual([
        {
            __domainValue: 0,
            "0-answer":"one"
        },
        {
            __domainValue: 1,
            "0-answer":"two"
        }
    ])
})
test("reducer() multiple getDomain",()=>{
    expect(
        reducer(
            [{start:0,stop:4,value:10}],
            {v:"value"},
            {
                getDomain:["start","stop",(v,i,a)=>(v.stop-v.start)/2]
            }
        )
    ).toEqual([
        {
            __domainValue:0,
            "0-v":10
        },
        {
            __domainValue:2,
            "0-v":10
        },
        {
            __domainValue:4,
            "0-v":10
        }
    ])
})
test("reducer() domainKey",()=>{
    expect(
        reducer(DATA,{"answer":"$.one.EN"},{domainKey:"x"})
    ).toEqual([{
        x:0,
        "0-answer":"one"
    }])
})
