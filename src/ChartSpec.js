import PropTypes from 'prop-types';

export const ScaleType = PropTypes.shape({
    //name: PropTypes.string, // wasn't used, what was the idea here?
    min: PropTypes.number,//do not set min / max if the values are not numbers
    max: PropTypes.number,
    label: PropTypes.string,//label to display on the scale
    scale: PropTypes.oneOf(["number", "category"]),//number is linear
    ticks: PropTypes.arrayOf(
        PropTypes.number,
    ),
    tickFormat: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),//what to display on axis, will also apply to tip if there isnt' a tipFormat
    tipFormat: PropTypes.oneOfType([PropTypes.string, PropTypes.func])//what to show in the tooltip for series that use this scale
});
export default {
    name: PropTypes.string.isRequired,//unique name of the chart, used when adding to a group
    group: PropTypes.string,//set of charts that have a common domain range and will zoom / scroll together
    width: PropTypes.number,//fixed width of the chart
    height: PropTypes.number,//fixed height if the chart
    left: ScaleType,//left scale, see scaleType
    right: ScaleType,//right scale, see scaleType
    data: PropTypes.array,//optional data for the entire chart, right now it is probably required for domain?
    domain: PropTypes.shape({
        label: PropTypes.string, // axis label
        min: PropTypes.number, // initial minimum to display
        max: PropTypes.number,  // initial maximum to display
        scale: PropTypes.oneOf(["time", "number", "category"]), //expected value type for the domain
        key: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),//how to get the domain value from the chart data
        ticks: PropTypes.oneOfType([
            PropTypes.func, // a function to create the ticks, must return [value] or [{value,label}]
            PropTypes.arrayOf(
                PropTypes.oneOfType([
                    PropTypes.number, //values to use for time / number scale / category
                    PropTypes.string, //values to use for category
                    PropTypes.shape({
                        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),//the value for the scale
                        label: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf([PropTypes.string])])//the label to use for this value
                    })
                ])
            )
        ]),
        tickFormat: PropTypes.oneOfType([
            PropTypes.string, //for time scale it will be used as a date format, for number scale it will be used as a size format (K,M,G)
            PropTypes.func//function (value)=>some node that can be rendered as a tick
        ]),
        tipFormat: PropTypes.oneOfType([PropTypes.string, PropTypes.func]) //same options as tickFormat but exclusively for the tooltip
    }),
    series: PropTypes.arrayOf(//each series to put into the chart
        PropTypes.shape({
            name: PropTypes.string.isRequired,// each series requires a name (for labeling)
            type: PropTypes.oneOf(["line", "points"]),//line and points work atm, bar is pending
            color: PropTypes.string,//set the render color, otherwise a color is selected from the theme
            yAxis: PropTypes.oneOf(["left", "right"]),//which axis for the series, default is left
            //TODO should series data also support jsonpath queuries into chart.data? add PropTypes.string and an accessor method for this.props.series[#].data?
            //TODO would be a good idea to compute the series data from the chartData when the prop is set / changed rather than for each render :)
            data: PropTypes.array, //data specific for this series, will use this instead of the chart.data
            domainKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),//key to access the domain value from series.data
            key: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),//key to access the scale value for this series
            //domain shift can also be accomplished with key or pre-processing but it's nice to have options
            domainSync: PropTypes.oneOfType([PropTypes.number, /*PropTypes.func*/]),
            domainShift: PropTypes.oneOfType([PropTypes.number, /*PropTypes.func*/]),//amount to shift domain values to fit the range of other series, not used by default            
            //domainAnchorValue: PropTypes.oneOfType([PropTypes.func,PropTypes.number]) would require all series to have it, bad idea
        }),
    ),
    vertical: PropTypes.arrayOf(//draw custom vertical lines (with optional label) on ther chart 
        PropTypes.shape({
            value: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.func]),//domain value for the line
            label: PropTypes.oneOfType([PropTypes.string, PropTypes.func])//label to draw on the chart
        })
    ),
    horizontal: PropTypes.arrayOf(//horizontal lines to draw on the chart
        PropTypes.shape({
            value: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.func]),//scale value for the line
            label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),//label to draw on the line, will draw on side of the targeted scale
            yAxis: PropTypes.oneOf(["left", "right"]),//scale to target, default is left
        })
    )
}
