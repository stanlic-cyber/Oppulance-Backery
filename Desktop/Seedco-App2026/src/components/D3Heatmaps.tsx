import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function D3Heatmap({ data, colorRange, title, subtitle }: { data: { x: string, y: string, value: number }[], colorRange: [string, string], title: string, subtitle: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous drawing
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 40, left: 60 },
      width = 400 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const myGroups = Array.from(new Set(data.map(d => d.x)));
    const myVars = Array.from(new Set(data.map(d => d.y)));

    const x = d3.scaleBand()
      .range([0, width])
      .domain(myGroups)
      .padding(0.05);

    svg.append("g")
      .style("font-size", 10)
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain").remove();

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars)
      .padding(0.05);

    svg.append("g")
      .style("font-size", 10)
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain").remove();

    const myColor = d3.scaleLinear<string>()
      .range(colorRange)
      .domain([0, 100]);

    // Tooltip
    const tooltip = d3.select('body').append('div')
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid 1px #eee")
        .style("border-radius", "8px")
        .style("padding", "8px")
        .style("position", "absolute")
        .style("font-size", "12px")
        .style("box-shadow", "0 4px 6px -1px rgb(0 0 0 / 0.1)");

    svg.selectAll()
      .data(data, function (d: any) { return d.x + ':' + d.y; })
      .join("rect")
      .attr("x", function (d) { return x(d.x)! })
      .attr("y", function (d) { return y(d.y)! })
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) { return myColor(d.value) })
      .style("stroke-width", 2)
      .style("stroke", "none")
      .style("opacity", 0.8)
      .on("mouseover", function (event, d) {
        d3.select(this).style("stroke", "black").style("opacity", 1);
        tooltip.style("opacity", 1)
               .html(`Region: ${d.x}<br/>Factor: ${d.y}<br/>Risk Score: ${d.value}`)
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseleave", function (d) {
        d3.select(this).style("stroke", "none").style("opacity", 0.8);
        tooltip.style("opacity", 0);
      });

      return () => {
          tooltip.remove();
      }

  }, [data, colorRange]);

  return (
    <div className="w-full flex-col flex h-full">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
        <div className="w-full flex-1 min-h-[250px] relative">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    </div>
  );
}
