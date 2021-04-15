


const theme = {
    colors: {
        primary: {
            100: "#0066CC",
            200: "#00659C",
        },
        secondary: {
            100: "#72767B",
        },
        text: {
            100: "#151515",
            200: "#72767B",
            300: "#393F44",
        },
        link: {
            normal: "#0066CC",
            hover: "#004080",
        },
        icon: {
            light: "#72767B",
        },
        alert: {
            success: {
                100: "#92D400",
                200: "#486B00",
            },
            information: {
                100: "#73BCF7",
                200: "#004368",
            },
            warning: {
                100: "#f0AB00",
                200: "#795600",
            },
            danger: {
                100: "#C9190B",
                200: "#A30000",
            }
        },
        chart: {
            blue:  ["#8BC1F7","#519DE9","#0066CC","#004B95","#002F5D"],
            green: ["#A2D99C","#88D080","#6EC664","#509149","#3B6C37"],
            purple:["#CBC0FF","#B1A3FF","#A18FFF","#8476D1","#6753AC"],
            cyan:  ["#8BB4B9","#5C969D","#2E7981","#015C65","#00434B"],
            gold:  ["#F9E0A2","#F6D173","#F4C145","#F0AB00","#C58C00"],
            orange:["#F4B678","#EF9234","#EC7A08","#C46100","#8F4700"]
        }
    }
}
export const chartColorNames = Object.keys(theme.colors.chart)
export const chartColorList = []
for (var i = 0; i < theme.colors.chart[chartColorNames[0]].length; i++) {
  for (var n = 0; n < chartColorNames.length; n++) {
    chartColorList.push(theme.colors.chart[chartColorNames[n]][i])
  }
}
export const chartColors = Object.keys(theme.colors.chart).reduce((rtrn,name,nameIndex)=>{
    const colors = theme.colors.chart[name];
    for(let i=0; i<colors.length; i++){
        rtrn.splice(nameIndex + i, 0, colors[i])
    }
    return rtrn;
},[])


export default theme;