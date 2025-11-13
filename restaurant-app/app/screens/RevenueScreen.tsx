import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { Button } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Svg, Rect, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

export default function RevenueScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Dữ liệu mẫu
  const data = [
    { date: "2025-11-01", total: 800000 },
    { date: "2025-11-02", total: 1200000 },
    { date: "2025-11-03", total: 1500000 },
    { date: "2025-11-04", total: 950000 },
    { date: "2025-11-05", total: 2100000 },
  ];

  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);

  const chartHeight = 200;
  const barWidth = 30;
  const gap = 20;
  const maxTotal = Math.max(...data.map((d) => d.total));

  // Hàm an toàn lấy giá trị date string cho Web
  const getWebDateValue = () => {
    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      return selectedDate.toISOString().split("T")[0];
    }
    return "";
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Doanh thu cửa hàng</Text>

      {/* Chọn ngày */}
      <View style={styles.filterBox}>
        <Text style={styles.label}>Chọn ngày:</Text>
        {Platform.OS === "web" ? (
          // Web: input type=date
          // @ts-ignore
          <input
            type="date"
            value={getWebDateValue()}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (!isNaN(newDate.getTime())) setSelectedDate(newDate);
            }}
            style={styles.webInput as any}
          />
        ) : (
          <>
            <Button
              mode="contained"
              onPress={() => setShowPicker(true)}
              style={styles.button}
            >
              {selectedDate.toLocaleDateString("vi-VN")}
            </Button>
            {showPicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, date) => {
                  if (date) setSelectedDate(date);
                  setShowPicker(false);
                }}
              />
            )}
          </>
        )}
      </View>

      {/* Tổng doanh thu */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
        <Text style={styles.summaryAmount}>{totalRevenue.toLocaleString()} đ</Text>
      </View>

      {/* Biểu đồ doanh thu & xu hướng */}
      <Text style={styles.chartTitle}>Doanh thu & Xu hướng</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={data.length * (barWidth + gap)} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#f97316" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#f97316" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {/* Cột */}
          {data.map((d, i) => {
            const barHeight = (d.total / maxTotal) * (chartHeight - 30);
            return (
              <React.Fragment key={i}>
                <Rect
                  x={i * (barWidth + gap)}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#gradBar)"
                  rx={6}
                />
                <SvgText
                  x={i * (barWidth + gap) + barWidth / 2}
                  y={chartHeight - 5}
                  fontSize="12"
                  fill="#374151"
                  textAnchor="middle"
                >
                  {d.date.split("-")[2]}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Đường xu hướng */}
          {data.map((d, i) => {
            if (i === 0) return null;
            const x1 = (i - 1) * (barWidth + gap) + barWidth / 2;
            const y1 = chartHeight - (data[i - 1].total / maxTotal) * (chartHeight - 30);
            const x2 = i * (barWidth + gap) + barWidth / 2;
            const y2 = chartHeight - (d.total / maxTotal) * (chartHeight - 30);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#10b981" strokeWidth={2} />;
          })}

          {/* Điểm đường */}
          {data.map((d, i) => {
            const cx = i * (barWidth + gap) + barWidth / 2;
            const cy = chartHeight - (d.total / maxTotal) * (chartHeight - 30);
            return <Circle key={i} cx={cx} cy={cy} r={4} fill="#10b981" />;
          })}
        </Svg>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#f97316", marginBottom: 16, textAlign: "center" },
  filterBox: { marginBottom: 20 },
  label: { fontSize: 14, color: "#374151", marginBottom: 8 },
  button: { backgroundColor: "#f97316", borderRadius: 8 },
  summaryBox: {
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 16, color: "#92400e", marginBottom: 6 },
  summaryAmount: { fontSize: 28, fontWeight: "700", color: "#b45309" },
  chartTitle: { fontSize: 16, fontWeight: "600", color: "#f97316", marginTop: 20, marginBottom: 8 },
  webInput: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 8, width: 200 },
});
