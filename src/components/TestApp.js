import React, { useState, useRef, useMemo, useEffect } from 'react';

export default ({state})=>{
    return (
        <div>
        <div>hi mom</div>
        <div>{JSON.stringify(state,null,2)}</div>
        </div>
    )
}
