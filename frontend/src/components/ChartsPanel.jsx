import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function ChartsPanel() {

  const [data, setData] = useState([]);

  useEffect(() => {

    function handleChart(event) {
      setData(event.detail?.data || []);
    }

    window.addEventListener("molstar-chart", handleChart);

    return () => {
      window.removeEventListener("molstar-chart", handleChart);
    };

  }, []);

  return (

    <div
      style={{
        height: "100%",
        width: "100%",
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "20px"
      }}
    >

      <h3
        style={{
          color: "white",
          marginBottom: "20px",
          textAlign: "center"
        }}
      >
        Interaction Chart
      </h3>

      <BarChart
        width={320}
        height={260}
        data={data}
        margin={{ top: 10, right: 20, left: 20, bottom: 40 }}
      >

        <CartesianGrid stroke="#334155" strokeDasharray="3 3" />

        <XAxis
          dataKey="residue"
          stroke="#ffffff"
          tick={{ fill: "#ffffff", fontSize: 12 }}
        />

        <YAxis
          stroke="#ffffff"
          tick={{ fill: "#ffffff", fontSize: 12 }}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            color: "#ffffff"
          }}
          labelStyle={{ color: "#ffffff" }}
        />

        <Bar
          dataKey="distance"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />

      </BarChart>

    </div>

  );

}