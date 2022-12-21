import { Component } from "react";
import {
  ReferenceLine,
  ReferenceArea,
  Rectangle,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import AlertStatus from './AlertStatus';

class LineChartComponent extends Component {
  state = {
    rawChartData: [],
    chartData: [],
    latestShortVolume: 0,
    latestLongVolume: 0,
    latestEthPrice: 0,
    offset: null,
    // numOfEntries: 0
  };

  formatData = (data) =>
    data.map(({ timestamp, shortVolume, longVolume }) => {

      return {
        date: timestamp,
        longMinusShort: longVolume - shortVolume
      }
    });

  gradientOffset = (data) => {
    return data.reduce(
      (previousValue, currentValue) => { return Math.abs(currentValue) > previousValue ? Math.abs(currentValue) : previousValue }, 0
    );
  };

  componentDidMount() {
    async function getChartData() {
      const chartDataEntriesLimit = 500;
      const response = await fetch('/api/positionsDataFromContentful');
      const responseJson = await response.json();
      const truncatedResponseJson = responseJson.slice(responseJson.length - chartDataEntriesLimit, responseJson.length);
      return truncatedResponseJson;
    }
    const fetchData = async () => {
      // const numOfEntriesResponse = await fetch('/api/getContentfulNumOfEntries');
      // const numOfEntries = await numOfEntriesResponse.json();
      const rawChartData = await getChartData();
      // TODO: detect > 5% price drop within 2-3 hours of timestamped records and add drop to data for reference dots
      const chartData = this.formatData(rawChartData);
      const latestRecord = rawChartData[rawChartData.length - 1];

      this.setState({
        rawChartData: rawChartData,
        chartData: chartData,
        latestShortVolume: latestRecord.shortVolume,
        latestLongVolume: latestRecord.longVolume,
        latestEthPrice: latestRecord.ethPrice,
        offset: this.gradientOffset(chartData),
        // numOfEntries: numOfEntries.numOfEntries
      });
    };
    fetchData();

    this.interval = setInterval(async () => {
      const updatedChartData = this.formatData(await getChartData());
      this.setState({ chartData: updatedChartData });
      console.log('refreshing on interval ...');
    }, 5 * 60 * 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const range = 47000000;
    const diffHours = function (startTime, endTime) {
      const differenceInMiliseconds = endTime - startTime;
      const differenceInSeconds = differenceInMiliseconds / 1000;
      const differenceInMinutes = differenceInSeconds / 60;
      const differenceInHours = differenceInMinutes / 60;

      return Math.abs(differenceInHours);
    }
    const prettifyNum = (num) => !!num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 0;
    const prettifyDate = (dateObj, showTime = true) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const timeStr = showTime ? `${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}` : '';
      return `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()} ${dateObj.getFullYear()} ${timeStr}`;
    }
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const timestamp = payload[0]?.payload.date;
        const dateObj = new Date(timestamp);
        const dateStr = prettifyDate(dateObj);
        const rawDataElement = this.state.rawChartData.find(element => element.timestamp === timestamp);

        return (
          <div className="custom-tooltip" >
            <table style={{ backgroundColor: "white", borderStyle: "solid", opacity: "1" }}>
              <tbody>
                <tr>
                  <td>{dateStr}</td>
                </tr>
                <tr>
                  <td>${prettifyNum(payload[0]?.payload.longMinusShort)}</td>
                </tr>
                {rawDataElement?.ethPrice &&
                  (
                    <tr>
                      <td>
                        <span style={{ color: "blue", fontWeight: "bold" }}>ETH:</span> ${prettifyNum(rawDataElement.ethPrice)}
                      </td>
                    </tr>
                  )}
                {rawDataElement?.percentPriceChange && (
                  <tr>
                    <td>
                      Price Δ: {rawDataElement.percentPriceChange}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }

      return null;
    };
    const formatYAxis = (num) => prettifyNum(num);
    const formatXAxis = (timestamp) => {
      const date = new Date(timestamp);
      return prettifyDate(date, false);
    }
    const { chartData } = this.state;

    return (
      <>
        <h1 style={{ marginTop: "25px", marginLeft: "150px", position: "absolute" }}>GMX Long/Short Relative Volume</h1>
        <table style={{ marginTop: "30px", marginLeft: "700px", position: "absolute" }}>
          <tbody>
            <tr>
              <td>
                <b>Long Volume: </b>
              </td>
              <td style={{ textAlign: "right" }}>
                ${prettifyNum(this.state.latestLongVolume)}
              </td>
            </tr>
            <tr>
              <td>
                <b>Short Volume: </b>
              </td>
              <td style={{ textAlign: "right" }}>
                ${prettifyNum(this.state.latestShortVolume)}
              </td>
            </tr>
            {!!this.state.latestEthPrice && (
              <tr>
                <td>
                  <b>ETH Price: </b>
                </td>
                <td style={{ textAlign: "right" }}>
                  ${prettifyNum(this.state.latestEthPrice)}
                </td>
              </tr>
            )}
            {!!this.state.chartData && this.state.chartData.length && (
              <tr>
                <td>
                  <b>Last Update: </b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <AlertStatus elapsedTime={diffHours((this.state.chartData.pop()).date, Date.now()).toFixed(2)} />
                </td>
              </tr>
            )}
            {/* <tr>
              <td>
                <b>DB Entries: </b>
              </td>
              <td style={{ textAlign: "right" }}>
                {prettifyNum(this.state.numOfEntries)}
              </td>
            </tr> */}
          </tbody>
        </table>
        <LineChart width={1000} height={700} data={chartData} margin={{ top: 130, right: 20, bottom: 100, left: 50 }}>
          {/* {this.state.rawChartData.map(entry => {
            if (!!entry.percentPriceChange) {
              return <ReferenceDot x={entry.timestamp} y={entry.shortLongDiff} r={5} fill="red" stroke="none" />;
            }
          })} */}
          <ReferenceLine y={0} stroke="orange" strokeWidth={2} strokeDasharray="3 3" />
          <ReferenceLine y={-range} stroke="#00FF00" strokeWidth={2} strokeDasharray="5 5" />
          {/* <ReferenceLine y={-50000000} label={{ value: 'open short here', fill: 'red', fontSize: '10px' }} stroke="blue" strokeWidth={0} strokeDasharray="5 5" /> */}
          <ReferenceLine y={range} stroke="red" strokeWidth={2} strokeDasharray="5 5" />
          {/* <ReferenceLine y={50000000} label={{ value: 'open long here', fill: 'green', fontSize: '10px' }} stroke="blue" strokeWidth={0} strokeDasharray="5 5" /> */}
          <ReferenceArea
            y1={-range}
            y2={range}
            shape={<Rectangle />}
          />
          <Line type="monotone" dataKey="longMinusShort" stroke="#8884d8" strokeWidth={2} dot={false} />
          <CartesianGrid stroke="#ccc" strokeWidth="5 5" />
          <XAxis dataKey="date" tickFormatter={formatXAxis} angle={-45} textAnchor="end" tick={{ fontSize: '12' }} />
          <YAxis tickFormatter={formatYAxis} domain={[-85000000, 85000000]} tick={{ fontSize: '12' }} />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </>
    );
  }
}

export default LineChartComponent;