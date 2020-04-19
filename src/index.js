import DataSet from '@antv/data-set';
import { Chart, registerAnimation } from '@antv/g2';
import { Scene, PointLayer, Popup, HeatmapLayer } from "@antv/l7";
import { GaodeMap, Mapbox } from "@antv/l7-maps";
registerAnimation('label-appear', (element, animateCfg, cfg) => {
  const label = element.getChildren()[0];
  const coordinate = cfg.coordinate;
  const startX = coordinate.start.x;
  const finalX = label.attr('x');
  const labelContent = label.attr('text');

  label.attr('x', startX);
  label.attr('text', 0);

  const distance = finalX - startX;
  label.animate((ratio) => {
    const position = startX + distance * ratio;
    const text = (labelContent * ratio).toFixed(0);

    return {
      x: position,
      text,
    };
  }, animateCfg);
});

registerAnimation('label-update', (element, animateCfg, cfg) => {
  const startX = element.attr('x');
  const startY = element.attr('y');
  // @ts-ignore
  const finalX = cfg.toAttrs.x;
  // @ts-ignore
  const finalY = cfg.toAttrs.y;
  const labelContent = element.attr('text');
  // @ts-ignore
  const finalContent = cfg.toAttrs.text;

  const distanceX = finalX - startX;
  const distanceY = finalY - startY;
  const numberDiff = +finalContent - +labelContent;

  element.animate((ratio) => {
    const positionX = startX + distanceX * ratio;
    const positionY = startY + distanceY * ratio;
    const text = (+labelContent + numberDiff * ratio).toFixed(0);

    return {
      x: positionX,
      y: positionY,
      text,
    };
  }, animateCfg);


});

function handleData(source) {
  source.sort((a, b) => {
    return b.countbystatedate - a.countbystatedate;
  });
  return source;
}

// const colorsMap = {
//   'Asia and the Pacific': '#f03838',
//   'Latin America and the Caribbean': '#1890FF',
//   'Europe and North America': '#2FC25B',
//   'Arab States': '#FACC14',
//   'Africa': '#223273',
// };
const colorsMap = {
  'Asia and the Pacific': '#ABD0CE',
  'Latin America and the Caribbean': '#F0E5DE',
  'Europe and North America': '#F1BBBA',
  'Arab States': '#7C7877',
  'Africa': '#CBA6C3',
};
const catcolorsMap = {
  'Cultural': '#ABD0CE',
  'Mixed': '#7C7877',
  'Natural': '#F1BBBA',
};

function setchart(id,padd) {
  let ordchart = new Chart({
    container: id,
    autoFit: true,
    height: 500,
    padding: padd,
  });
  return ordchart;
}

function note(cont,chart,pos,size) {
  chart.annotation().text({
    top: true,
    center: true,
    position: pos,
    content: cont,
    style: {
      fontSize: size,
      fontWeight: 'normal',
      fill: 'rgba(0,0,0,0.45)'
    }
  });
}

const fetchData = async () => {
  const [data] = await Promise.all([
    fetch(
      'https://raw.githubusercontent.com/pengx12/res/master/worldheritage.csv',
    ).then((d) => d.text()),
  ]);
  // };

  // fetch('https://raw.githubusercontent.com/pengx12/res/master/whc-sites-2019-2.csv')
  //   .then(res => res.text())
  //   .then(data => {
  const ds = new DataSet();

  const dv1 = ds.createView().source(data, {
    type: "csv"
  });
  dv1.transform({
    type: 'map',
    callback: (row) => {
      if (typeof (row.date_inscribed) === 'string') {
        row.date_inscribed = row.date_inscribed.replace(',', '');
      }
      row.date_inscribed = parseInt(row.date_inscribed, 10);
      row.countbyregion = parseInt(row.countbyregion, 10);
      row.countbycatdate= parseInt(row.countbycatdate, 10);
      row.gdp = parseInt(row.gdp, 10);
      row.count= parseInt(row.count, 10);
      row.count=row.count/1000;
      row.countbystate=parseInt(row.countbystate, 10);
      row.countbystatedate=parseInt(row.countbystatedate, 10);
      return row;
    }
  });
 
  const dv_numbyregion = ds.createView().source(dv1.rows);
  dv_numbyregion.transform({
    type: 'aggregate', // 别名summary
    fields: ['category'], // 统计字段集
    operations: ['count'], // 统计操作集
    as: ['region_num'], // 存储字段集
    groupBy: ['region_en', 'category'], // 分组字段集
  });
  dv_numbyregion.transform({
    type: 'pick',
    fields: ['region_en', 'category','countbyregion'],
  });
  
  dv_numbyregion.transform({
    type: 'sort-by',
    fields: ['countbyregion'], // 根据指定的字段集进行排序，与lodash的sortBy行为一致
    order: 'DESC', // 默认为 ASC，DESC 则为逆序
  });
  dv_numbyregion.transform({
    type: 'percent',
    field: 'countbyregion',
    dimension: 'region_en',
    as: 'percent',
  });

  let chartbyregion = setchart('regioncontainer',[10,20])
  const view2 = chartbyregion.createView();
  view2.data(dv_numbyregion.rows);
  view2.interval().adjust('stack').position('percent').color('region_en', (val) => colorsMap[val])
    .label('region_en', {
      type: 'pie',
    });
  view2.coordinate('theta', {
    radius: 1,
  });
  view2.tooltip('region_en*percent', (item, percentage) => {
    percentage = (percentage * 100).toFixed(2) + '%';
    return {
      name: item,
      value: percentage,
    };
  })
  note('Number of World Heritage properties by region',chartbyregion,['14%', '0%'],12)
  chartbyregion.interaction('element-active');
  chartbyregion.render();

  let chartbyregionvar = setchart('regioncontainervar',[10,20])
  let regioncount = 1;
  let year = 1978;
  let interval1;
  function regioncountUp() {
    if (regioncount == 1) {
      let dv_numbyregionvar = ds.createView().source(dv1.rows);
      dv_numbyregionvar.transform({
        type: 'filter',
        callback(row) {
          return row.date_inscribed < year + regioncount;
        },
      });
      chartbyregionvar.data(dv_numbyregionvar.rows);
      chartbyregionvar.coordinate('polar', {
        radius: 1,
        startAngle: -0.2 * Math.PI,
        endAngle: 2 * Math.PI,
      });
      chartbyregionvar.axis('name_en', {
        label: false,
        title: false,
        line: false,
        // grid:null,
        animate: false
      });
      // chartbyregionvar.axis(false);
      chartbyregionvar.point()
        .adjust('jitter')
        .position('name_en')
        .color('region_en', (val) => colorsMap[val])
        .shape('circle')
        .style({
          fillOpacity: 0.85,
        })
        .animate({
          appear: false,
          update: false,
          enter: false,
          leave: false

        })
      chartbyregionvar.tooltip({
        shared:true
      })
      chartbyregionvar.annotation().text({
        position: ['49%', '50%'],
        content: dv_numbyregionvar.rows.length,
        style: {
          fontSize: 80,
          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.5
        },
        top: false,
        animate: false,
      });
      chartbyregionvar.annotation().text({
        position: ['80%', '80%'],
        content: year,
        style: {
          fontSize: 60,
          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.3
        },
        top: false,
        animate: false,
      });
      chartbyregionvar.annotation().text({
        top: true,
        center: true,
        position: ['5%', '0%'],
        content: 'Number of World Heritage properties inscribed each year by region',
        style: {
          fontSize: 12,
          fontWeight: 'normal',
          fill: 'rgba(0,0,0,0.45)'
        },
        animate: false
      });
      chartbyregionvar.render();

    }
    else if (regioncount + year < 2020) {
      let dv_numbyregionvar = ds.createView().source(dv1.rows);
      dv_numbyregionvar.transform({
        type: 'filter',
        callback(row) {
          return row.date_inscribed < year + regioncount;
        },
      });
      chartbyregionvar.annotation().clear(true);
      chartbyregionvar.annotation().text({
        top: true,
        center: true,
        position: ['5%', '0%'],
        content: 'Number of World Heritage properties inscribed each year by region',
        style: {
          fontSize: 12,
          fontWeight: 'normal',
          fill: 'rgba(0,0,0,0.45)'
        },
        animate: false
      });
      chartbyregionvar.annotation().text({
        position: ['49%', '50%'],
        content: dv_numbyregionvar.rows.length,
        style: {
          fontSize: 80,
          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.5
        },
        top: false,
        animate: false,
      });
      chartbyregionvar.annotation().text({
        position: ['80%', '80%'],
        content: (year+regioncount),
        style: {
          fontSize: 60,
          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.3
        },
        top: false,
        animate: false,
      });
      chartbyregionvar.changeData(dv_numbyregionvar.rows);
    }
    regioncount += 1
    if (regioncount + year === 2020) {
      // clearInterval(interval1);
      regioncount = 2
    }
  }
  regioncountUp();
  interval1 = setInterval(regioncountUp, 2000);


  const regioncatchart = new Chart({
    container: 'regioncatcontainer',
    autoFit: true,
    height: 500,
    padding: [60, 40],
  });
  const colorMap1 = {
    'Strongly Agree': '#3561A7',
    Agree: '#80B2D3',
    'No Opinion': '#D9F0F6',
    Disagree: '#EC7743',
    'Strongly Disagree': '#CB2920'
  };
  const regioncatview = regioncatchart.createView(
    {
      region: {
        start: {
          x: 0.5,
          y: 0
        },
        end: {
          x: 1,
          y: 1
        }
      }
    }
  );
  regioncatview.coordinate('rect').transpose();
  const dv_regioncat = ds.createView().source(dv1.rows);
  dv_regioncat.transform({
    type: 'map',
    callback: (row) => {
      row.catregion = row.region_en + " (" + row.category + ")";
      return row;
    }
  });
  dv_regioncat.transform({
    type: 'aggregate', // 别名summary
    fields: ['category'], // 统计字段集
    operations: ['count'], // 统计操作集
    as: ['region_num'], // 存储字段集
    groupBy: ['catregion', 'region_en'], // 分组字段集
  });
  dv_regioncat.transform({
    type: 'percent',
    field: 'region_num',
    dimension: 'catregion',
    groupBy: ['region_en'],
    as: 'percent',
  });
  dv_regioncat.transform({
    type: 'sort-by',
    fields: ['region_num'], // 根据指定的字段集进行排序，与lodash的sortBy行为一致
    order: 'DESC', // 默认为 ASC，DESC 则为逆序
  });
  regioncatview.data(dv_regioncat.rows);
  regioncatview.scale('value', {
    nice: true,
  });

  regioncatview
    .interval()
    .position('region_en*percent')
    .color('category', (val) => catcolorsMap[val])
    .adjust('stack')
    .tooltip('category*region_num');

  regioncatview.axis('value', {
    position: 'right',
    title: null,
    tickLine: null,
    labelOffset: 30,
    formatter(val) {
      return val + '%';
    }
  });
  regioncatview.scale({
    percent: {
      min: 0,
      formatter(val) {
        return (val * 100).toFixed(2) + '%';
      },
    }
  });
  // regioncatchart.tooltip({
  //   shared: true,
  //   showMarkers: false,
  // });
  regioncatview.interaction('active-region');
  regioncatview.legend();


  const regiontotview = regioncatchart.createView(
    {
      region: {
        start: {
          x: 0,
          y: 0
        },
        end: {
          x: 0.2,
          y: 1
        }
      }
    }
  );
  dv_regioncat.transform({
    type: 'aggregate', // 别名summary
    fields: ['region_num'], // 统计字段集
    operations: ['sum'], // 统计操作集
    as: ['catnum'], // 存储字段集
    groupBy: ['category'], // 分组字段集
  });
  regiontotview.data(dv_regioncat.rows)
  regiontotview
    .interval()
    .position('catnum')
    .color('category', (val) => catcolorsMap[val])
    .adjust('stack')
    .tooltip();

  regioncatchart.annotation().text({
    top: true,
    center: true,
    position: ['17%', '0%'],
    content: 'Proportion of World Heritage properties in Different Regions: Cultural, Natural and Mixed',
    style: {
      fontSize: 16,
      fontWeight: 'normal',
      fill: 'rgba(0,0,0,0.45)'
    }
  });
  regiontotview.annotation().text({
    top: true,
    center: true,
    position: ['80%', '8%'],
    content: 'Whole World Heritage Properties Categories',
    style: {
      fill: 'rgba(0,0,0,0.4)'
    }
  });
  regioncatchart.interaction('active-region');
  regioncatchart.render();




  const yearchart = new Chart({
    container: 'yearcontainer',
    autoFit: true,
    height: 500,
    padding: [20, 20],
  });

  // yearchart.interaction('brush');
  yearchart.tooltip({
    showCrosshairs: true
  });
  yearchart.removeInteraction('tooltip');
  const dv_numbyyear = ds.createView().source(dv1.rows);

  dv_numbyyear.transform({
    type: 'aggregate', // 别名summary
    fields: ['name_en'], // 统计字段集
    operations: ['count'], // 统计操作集
    as: ['year_num'], // 存储字段集
    groupBy: ['date_inscribed', 'category_short', 'category'], // 分组字段集
  });
  dv_numbyyear.transform({
    type: 'fill-rows',
    groupBy: ['date_inscribed'],
    orderBy: ['category_short', 'category'],
    fillBy: 'order', // 默认为 group，可选值：order
  });

  dv_numbyyear.transform({
    type: 'map',
    callback: (row) => {
      if (typeof (row.date_inscribed) === 'string') {
        row.date_inscribed = row.date_inscribed.replace(',', '');
      }
      if (isNaN(row.year_num)) {
        row.year_num = 0;
      }
      row.date_inscribed = parseInt(row.date_inscribed, 10);
      if (row.category_short == "C") {
        row.cultureyear = row.year_num;
        row.natureyear = 0
        row.mixyear = 0
      }
      if (row.category_short == "N") {
        row.cultureyear = 0;
        row.natureyear = row.year_num;
        row.mixyear = 0;
      }
      if (row.category_short == "C/N") {
        row.cultureyear = 0;
        row.natureyear = 0;
        row.mixyear = row.year_num;
      }
      row.year_sum = row.year_num;
      return row;
    }
  });

  dv_numbyyear.transform({
    type: 'sort-by',
    fields: ['date_inscribed'], // 根据指定的字段集进行排序，与lodash的sortBy行为一致
    order: 'ASC', // 默认为 ASC，DESC 则为逆序
  });
  for (let i = 1; i < dv_numbyyear.rows.length; i++) {
    dv_numbyyear.rows[i].cultureyear = dv_numbyyear.rows[i - 1].cultureyear + dv_numbyyear.rows[i].cultureyear;
    dv_numbyyear.rows[i].natureyear = dv_numbyyear.rows[i - 1].natureyear + dv_numbyyear.rows[i].natureyear;
    dv_numbyyear.rows[i].mixyear = dv_numbyyear.rows[i - 1].mixyear + dv_numbyyear.rows[i].mixyear;
    // dv_numbyyear.rows[i].year_sum=dv_numbyyear.rows[i-1].year_sum+dv_numbyyear.rows[i].year_num;
    if (dv_numbyyear.rows[i].category_short == "C") {
      dv_numbyyear.rows[i].year_sum = dv_numbyyear.rows[i].cultureyear;
    }
    if (dv_numbyyear.rows[i].category_short == "N") {
      dv_numbyyear.rows[i].year_sum = dv_numbyyear.rows[i].natureyear;
    }
    if (dv_numbyyear.rows[i].category_short == "C/N") {
      dv_numbyyear.rows[i].year_sum = dv_numbyyear.rows[i].mixyear;
    }
    dv_numbyyear.rows[i].stackyear = dv_numbyyear.rows[i].cultureyear + dv_numbyyear.rows[i].natureyear + dv_numbyyear.rows[i].mixyear;
  }


  const yearView = yearchart.createView({
    region: {
      start: {
        x: 0,
        y: 0
      },
      end: {
        x: 1,
        y: 0.5
      }
    }
  });
  yearView.data(dv_numbyyear.rows);
  yearView.interval().position('date_inscribed*year_sum').color('category', (val) => catcolorsMap[val])
  // yearView.legend({
  //   position: 'top'
  // });
  yearView.interaction('tooltip');
  yearView.interaction('sibling-tooltip');



  const yeardfView = yearchart.createView({
    region: {
      start: {
        x: 0,
        y: 0.6
      },
      end: {
        x: 1,
        y: 1
      }
    }
  });
  yeardfView.data(dv_numbyyear.rows);
  // yearView.interval().position('date_inscribed*year_sum').color('category_short').label('year_sum');
  yeardfView.line().position('date_inscribed*year_num')
  .color('category', (val) => catcolorsMap[val])
  // .label('year_sum');
  // yeardfView.point().position('date_inscribed*year_num').color('category');
  yeardfView.axis('Year', {
    subTickLine: {
      count: 3,
      length: 3,
    },
    tickLine: {
      length: 6,
    },
  });
  yeardfView.interaction('tooltip');
  yeardfView.interaction('sibling-tooltip');

  yearchart.legend({
    position: 'top'
  });
  // yeardifchart.render();
  yearView.annotation().text({
    top: true,
    center: true,
    position: [1986, 850],
    content: 'Number of World Heritage properties inscribed each Year: Cultural, Natural and Mixed',
    style: {
      fontSize: 12,
      fontWeight: 'normal',
      fill: 'rgba(0,0,0,0.45)'
    }
  });
  yeardfView.annotation().text({
    top: true,
    center: true,
    position: [1986, 52],
    content: 'Increasing Rate of World Heritage properties inscribed each Year: Cultural, Natural and Mixed',
    style: {
      fontSize: 12,
      fontWeight: 'normal',
      fill: 'rgba(0,0,0,0.45)'
    }
  });
  yearchart.render();




  const scene = new Scene({
    id: "map",
    map: new GaodeMap({
      pitch: 6,
      style: "light",
      zoom: 1.8
    })
  });
  const pointLayer = new PointLayer({})
    .source(data, {
      parser: {
        type: "csv",
        x: "longitude",
        y: "latitude"
      }
    })
    .shape("circle")
    .active(true)
    .animate(true)
    .size(16)

    //.color("category", ["#4cfd47", "#F6BD16", "#E86452"])

    .color('category', (val) => catcolorsMap[val])
    // .style({
    //   opacity: 0.7
    // });
  pointLayer.on("mousemove", e => {
    const popup = new Popup({
      offsets: [0, 0],
      closeButton: false
    })
      .setLnglat(e.lngLat)
      .setHTML(`<span>${e.feature.name_en}\n\n ${e.feature.category}</span>`);
    scene.addPopup(popup);
  });
  scene.addLayer(pointLayer);
//dvvar
  let dv_numbyrnationvar = ds.createView().source(dv1.rows);

  dv_numbyrnationvar.transform({
    type: 'fill-rows',
    groupBy: ['date_inscribed'],
    orderBy: ['states_name_en','region_en'],
    fillBy: 'order', // 默认为 group，可选值：order
  });
  dv_numbyrnationvar.transform({
    type: 'sort-by',
    fields: ['states_name_en','date_inscribed'], // 根据指定的字段集进行排序，与lodash的sortBy行为一致
    order: 'ASC', // 默认为 ASC，DESC 则为逆序
  });
  for (let i = 1; i < dv_numbyrnationvar.rows.length; i++) {
    let row=dv_numbyrnationvar.rows[i]
    if (row.states_name_en!=dv_numbyrnationvar.rows[i-1].states_name_en){
      continue
    }
    if (isNaN(row.countbystatedate)) {
      row.countbystatedate = dv_numbyrnationvar.rows[i-1].countbystatedate
    }
    if (isNaN(row.gdp)) {
      row.gdp = dv_numbyrnationvar.rows[i-1].gdp
    }
    if (isNaN(row.count)) {
      row.count = dv_numbyrnationvar.rows[i-1].count
    }
    if (isNaN(row.countbystate)) {
      row.countbystate = dv_numbyrnationvar.rows[i-1].countbystate
    }
    if (isNaN(row.region_en)) {
      row.region_en = dv_numbyrnationvar.rows[i-1].region_en
    }
  }
  dv_numbyrnationvar.transform({
    type: 'map',
    callback: (row) => {
      row.countbystatedatesize=row.countbystatedate*1000;
      return row;
    }
  });



  // const heatscene = new Scene({
  //   id: "heatmap",
  //   map: new GaodeMap({
  //     pitch: 43,
  //     style: "dark",
  //     zoom: 1.8
  //   })
  // });
  // const layer = new HeatmapLayer({})
  //   .source(data, {
  //     parser: {
  //       type: "csv",
  //       x: "longitude",
  //       y: "latitude"
  //     },
  //     transforms: [
  //       {
  //         type: 'hexagon',
  //         size: 2500,
  //         field: 'gdp',
  //         method: 'countbycatdate'
  //       }
  //     ]
  //   })
  //   .size('countbycatdate', countbycatdate => {
  //     return countbycatdate * 200;
  //   })
  //   .shape('hexagonColumn')
  //   .style({
  //     coverage: 0.8,
  //     angle: 0,
  //     opacity: 1.0
  //   })
  //   .active(true)
  //   .animate(true)
  //   .color('sum', [
  //     '#094D4A',
  //     '#146968',
  //     '#1D7F7E',
  //     '#289899',
  //     '#34B6B7',
  //     '#4AC5AF',
  //     '#5FD3A6',
  //     '#7BE39E',
  //     '#A1EDB8',
  //     '#C3F9CC',
  //     '#DEFAC0',
  //     '#ECFFB1'
  //   ]);
  // heatscene.addLayer(layer);

  // pointLayer.on("mousemove", e => {
  //   const popup = new Popup({
  //     offsets: [0, 0],
  //     closeButton: false
  //   })
  //     .setLnglat(e.lngLat)
  //     .setHTML(`<span>${e.feature.name_en}\n\n ${e.feature.category}</span>`);
  //   scene.addPopup(popup);
  // });
  // scene.addLayer(pointLayer);



//   const dv_numyearnation = ds.createView().source(dv1.rows);
//   dv_numyearnation.transform({
//     type: 'aggregate', // 别名summary
//     fields: ['category'], // 统计字段集
//     operations: ['count'], // 统计操作集
//     as: ['nationyearnum'], // 存储字段集
//     groupBy: ['date_inscribed', 'states_name_en'], // 分组字段集
//   });

//   dv_numyearnation.transform({
//     type: 'fill-rows',
//     groupBy: ['states_name_en'],
//     orderBy: ['date_inscribed'],
//     fillBy: 'order', // 默认为 group，可选值：order
//   });

//   dv_numyearnation.transform({
//     type: 'map',
//     callback: (row) => {
//       if (typeof (row.date_inscribed) === 'string') {
//         row.date_inscribed = row.date_inscribed.replace(',', '');
//       }
//       row.date_inscribed = parseInt(row.date_inscribed, 10);

//       if (isNaN(row.nationyearnum)) {
//         row.nationyearnum = 0;
//       }
//       return row;
//     }
//   });
//   // dv_numyearnation.transform({
//   //   type: 'filter',
//   //   callback(row) {
//   //     return row.countbystate >4;
//   //   },
//   // });
//  dv_numbyyear.transform({
//     type: 'fill-rows',
//     groupBy: ['date_inscribed'],
//     orderBy: ['state_name_en'],
//     fillBy: 'order', // 默认为 group，可选值：order
//   });
  // dv_numyearnation.transform({
  //   type: 'sort-by',
  //   fields: ['date_inscribed'], // 根据指定的字段集进行排序，与lodash的sortBy行为一致
  //   order: 'ASC', // 默认为 ASC，DESC 则为逆序
  // });  
  // dv_numyearnation.transform({
  //   type: 'partition',
  //   groupBy: ['date_inscribed'], // 以year字段进行分组
  //   orderBy: ['states_name_en'], // 以month字段进行排序
  // });
  // for (let i = 1; i < Object.keys(dv_numyearnation.rows).length; i++) {
  //   for (let j = 0; j < Object.values(dv_numyearnation.rows)[i].length; j++) {
  //     let key = Object.keys(dv_numyearnation.rows)[i];
  //     let k2 = Object.keys(dv_numyearnation.rows)[i - 1];
  //     dv_numyearnation.rows[key][j].nationyearnum += dv_numyearnation.rows[k2][j].nationyearnum;
  //   }
  // }
  let count = 0;
  let motionyearchart;
  let interval;
  let cyear=1978
  function countUp() {
    let dv_numyearnation = ds.createView().source(dv_numbyrnationvar.rows)
    dv_numyearnation.transform({
      type: 'filter',
      callback(row) {
        return row.date_inscribed == cyear + count;
      },
    });
    dv_numyearnation.transform({
          type: 'filter',
          callback(row) {
            return row.countbystate >4;
          },
        });
    if (count === 0) {
      motionyearchart = new Chart({
        container: 'motionyearcontainer',
        autoFit: true,
        height: 320,
        padding: [48, 60]
      });
      // @ts-ignore
      let ss = Object.values(dv_numyearnation.rows)[count];
      // console.log(Object.keys(dv_numyearnation.rows));
      motionyearchart.data(handleData(dv_numyearnation.rows));
      // motionyearchart.coordinate('rect').transpose();
      motionyearchart.legend({position:'top'});
      // chart.tooltip(false);
      // chart.axis('value', false);
      motionyearchart.axis('states_name_en', {
        animateOption: {
          update: {
            duration: 1000,
            easing: 'easeLinear'
          }
        }
      });
      motionyearchart.annotation().text({
        position: ['95%', '17%'],
        content: (cyear+count),
        style: {
          fontSize: 40,
          fontWeight: 'bold',
          fill: '#ddd',
          textAlign: 'top'
        },
      });
      motionyearchart
        .interval()
        .position('states_name_en*countbystatedate')
        // .color('region_en')

        .color('region_en', (val) => colorsMap[val])
        .label('countbystatedate', (value) => {
          if (value !== 0) {
            return {
              animate: {
                appear: {
                  animation: 'label-appear',
                  delay: 0,
                  duration: 1000,
                  easing: 'easeLinear'
                },
                update: {
                  animation: 'label-update',
                  duration: 1000,
                  easing: 'easeLinear'
                }
              },
              offset: 5,
            };
          }
        }).animate({
          appear: {
            duration: 1000,
            easing: 'easeLinear'
          },
          update: {
            duration: 1000,
            easing: 'easeLinear'
          }
        });
        motionyearchart.annotation().text({
          top: true,
          center: true,
          position: ['18%', '0%'],
          content: 'Nations Inscribing More than 5 World Heritage Properties',
          style: {
            fontSize: 16,
            fontWeight: 'normal',
            fill: 'rgba(0,0,0,0.45)'
          },
          animate: false
        });
      motionyearchart.render();
    } else {
      motionyearchart.annotation().clear(true);
      motionyearchart.annotation().text({
        position: ['95%', '17%'],
        content: (count+cyear),
        style: {
          fontSize: 40,
          fontWeight: 'bold',
          fill: '#ddd',
          textAlign: 'end'
        },
      });
      motionyearchart.annotation().text({
        top: true,
        center: true,
        position: ['18%', '0%'],
        content: 'Nations Inscribing More than 5 World Heritage Properties',
        style: {
          fontSize: 16,
          fontWeight: 'normal',
          fill: 'rgba(0,0,0,0.45)'
        },
        animate: false
      });
      // @ts-ignore
      motionyearchart.changeData(dv_numyearnation.rows);
    }

    ++count;

    if (count+cyear === 2020) {
      clearInterval(interval);
      // count=0
    }
  }

  countUp();
  interval = setInterval(countUp, 1200);




  // const arrivaldv = ds.createView().source(arrivaldata, {
  //   type: "csv"
  // });
  // const findv = ds.createView().source(findata, {
  //   type: "csv"
  // });
  // arrivaldv.transform({
  //   type: 'map',
  //   callback: (row) => {
  //     if (typeof (row.Year) === 'string') {
  //       row.Year = row.Year.replace(',', '');
  //     }
  //     row.Year = parseInt(row.Year, 10);
  //     row.count = parseInt(row.count, 10);
  //     return row;
  //   }
  // });
  // findv.transform({
  //   type: 'map',
  //   callback: (row) => {
  //     if (typeof (row.Year) === 'string') {
  //       row.Year = row.Year.replace(',', '');
  //     }
  //     row.Year = parseInt(row.Year, 10);
  //     row['GDP per capita'] = parseInt(row['GDP per capita'], 10);
  //     return row;
  //   }
  // });
  // for (let i = 0; i < Object.keys(dv_numyearnation.rows).length; i++) {
  //   for (let j = 0; j < Object.values(dv_numyearnation.rows)[i].length; j++) {
  //     let key = Object.keys(dv_numyearnation.rows)[i];
  //     let cur = dv_numyearnation.rows[key][j];
  //     for (let ii = 0; ii < arrivaldv.rows.length; ii++) {
  //       if ((arrivaldv.rows[ii].Entity == cur.states_name_en) && (arrivaldv.rows[ii].Year == cur.date_inscribed)) {
  //         dv_numyearnation.rows[key][j].arrivalcount = arrivaldv.rows[ii].count
  //       }
  //     }
  //     for (let ii = 0; ii < findv.rows.length; ii++) {
  //       if ((findv.rows[ii].Entity == cur.states_name_en) && (findv.rows[ii].Year == cur.date_inscribed)) {
  //         dv_numyearnation.rows[key][j].gdp = findv.rows[ii]['GDP per capita']
  //       }
  //     }
  //     // if (cur.states_name_en==)
  //     // console.log(dv_numyearnation.rows[key]);
  //     // console.log(dv_numyearnation.rows[key][j]);
  //     // dv_numyearnation.rows[key][j].nationyearnum+=dv_numyearnation.rows[k2][j].nationyearnum;
  //   }
  // }
  // console.log(dv_numyearnation)
  const motionnationchart = new Chart({
    container: 'motionnationcontainer',
    autoFit: true,
    height: 420,
    padding: [66, 80],
  });
  let nationcount = 0;
  year = 1978;
  let interval2;
  function nationcountUp() {
    if (nationcount == 0) {
      let dv_numbyrnationvartmp = ds.createView().source(dv_numbyrnationvar.rows);

      dv_numbyrnationvartmp.transform({
            type: 'filter',
            callback(row) {
              return row.date_inscribed == year + nationcount;
            },
          });
      motionnationchart.scale({
        gdp: {
          type: 'log',
          max: 1000000,
          min: 1001,
          tickInterval: 10,
          alias: 'GDP'
        },
        count: {
          type: 'log',
          max: 1000000,
          min: 50,
          alias: 'Arrival Tourists Count (1000)'
        },
        states_name_en: {
          key: true // 自定义每条数据的 id
        },
      });
      motionnationchart.axis('gdp', {
        title: {
          style: {
            fill: '#8C8C8C',
            fontSize: 14
          }
        }
      });
      motionnationchart.axis('count', {
        title: {
          style: {
            fill: '#8C8C8C',
            fontSize: 14
          }
        },
      });
      motionnationchart.data(dv_numbyrnationvartmp.rows);
      motionnationchart.point()
        .position('gdp*count')
        .tooltip('states_name_en*countbystatedate')
        .color('region_en', (val) => colorsMap[val])
        .size('countbystatedate')
        // .size('countbystatedate', countbystatedate => {
        //   return countbystatedate ;
        // })
        .shape('circle')
        .style({
          fillOpacity: 0.85,
        })
        .animate({
          appear: false,
          update: false,
          enter: false,
          leave: false
        })
        motionnationchart.legend({position:'bottom'})
        motionnationchart.interaction('element-active');
      motionnationchart.annotation().text({
        position: ['80%', '80%'],
        content: (year),
        style: {
          fontSize: 100,

          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.3
        },
        top: false,
        animate: false,
      });
      motionnationchart.annotation().text({
        top: true,
        center: true,
        position: ['12%', '3%'],
        content: 'Relation between Number of World Heritage, Arrival Tourists and GDP of a Nation',
        style: {
          fontSize: 16,
          fontWeight: 'normal',
          fill: 'rgba(0,0,0,0.45)'
        },
        animate: false
      });
      motionnationchart.render();

    }
    else if (nationcount + year < 2020) {
      motionnationchart.annotation().clear(true);
      motionnationchart.annotation().text({
        top: true,
        center: true,
        position: ['12%', '3%'],
        content: 'Relation between Number of World Heritage, Arrival Tourists and GDP of a Nation',
        style: {
          fontSize: 16,
          fontWeight: 'normal',
          fill: 'rgba(0,0,0,0.45)'
        },
        animate: false
      });
      motionnationchart.annotation().text({
        position: ['80%', '80%'],
        content: year + nationcount,
        style: {
          fontSize: 100,
          fill: '#999',
          textAlign: 'center',
          fillOpacity: 0.3
        },
        top: false,
        animate: false,

      });
      let dv_numbyrnationvartmp = ds.createView().source(dv_numbyrnationvar.rows);

      dv_numbyrnationvartmp.transform({
        type: 'filter',
        callback(row) {
          return row.date_inscribed === nationcount+year;
        },
      });
      motionnationchart.changeData(dv_numbyrnationvartmp.rows);
    }
    if (nationcount + year > 2019) {
      // clearInterval(interval2);
      nationcount = 0
    }
    nationcount += 1
  }

  nationcountUp();
  interval2 = setInterval(nationcountUp, 1200);
  // });
// function cnt() {
//   nationcountUp();
//   interval2 = setInterval(nationcountUp, 2000);
// }
};
fetchData();