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
            green: ["#BDE2B9","#7CC674","#4CB140","#38812F","#23511E"],
            purple:["#B2B0EA","#8481DD","#5752D1","#3C3D99","#2A265F"],
            cyan:  ["#A2D9D9","#73C5C5","#009596","#005F60","#003737"],
            gold:  ["#F9E0A2","#F6D173","#F4C145","#F0AB00","#C58C00"],
            orange:["#F4B678","#EF9234","#EC7A08","#C46100","#8F4700"],
            red:["#C9190B","#A30000","#7D1007","#470000","#2C0000"],
            grey:["#D2D2D2","#BBB","#8B8D8F","#72767B","#4D5258"]
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