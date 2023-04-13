const queryurl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
const tectonicplatesurl = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json"

// Perform a GET request to the query URL.
d3.json(queryurl).then(function(data) {
  // Console log retrieved data
  console.log(data);

  // Number of data points on the data set
  console.log(`Number of records: ${data.metadata.count}`);

  // Change time format 
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString 
  let options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  options.timeZone = 'UTC';

  // Create a object list with the target data columns
  let Earthquake_Data = [];
  for (let i = 0; i < data.features.length; i++) {
      let time = new Date(data.features[i].properties.time);
          Earthquake_Data.push({
              "Title": data.features[i].properties.title,
              "Time": time.toLocaleTimeString("en-US", options),
              "URL": data.features[i].properties.url,
              "Lat": data.features[i].geometry.coordinates[0],
              "Lon": data.features[i].geometry.coordinates[1],
              "Mag": data.features[i].properties.mag,
              "Depth": data.features[i].geometry.coordinates[2]
          });
      };
      console.log(Earthquake_Data);
  
  
      // Send object to createFeatures function
      createFeatures(data.features);
});


// Create marker size function
function markerSize(magnitude) {
  return magnitude * 5000;
};


// Create marker color function. Colour determined by earthquake depth 
function markerColour(depth){
  if (depth < 10) return "limegreen";
  else if (depth < 30) return "greenyellow";
  else if (depth < 50) return "yellow";
  else if (depth < 70) return "orange";
  else if (depth < 90) return "orangered";
  else return "#red";
}


// Code for createFeatures 
function createFeatures(earthquakesData) {

  // Create onEachFeature Function to create layer.bindPopup
  function onEachFeature(feature, layer) {
    layer.bindPopup(`<h3>Location: ${feature.properties.title}</h3><hr>
    <p>Date: ${new Date(feature.properties.time)}</p>
    <p>Updated: ${new Date(feature.properties.updated)}</p>
    <p>Latitude/Longitude: ${feature.geometry.coordinates[0]}° / ${feature.geometry.coordinates[1]}°</p>
    <p>Magnitude: ${feature.properties.mag}ml</p>
    <p>Depth: ${feature.geometry.coordinates[2]}km</p>
    <a href="${feature.properties.url}" target="_blank">More details...</a>`);
  }

  // Create a GeoJSON layer with the features array on the earthquakeData object
  let earthquakes = L.geoJSON(earthquakesData, {
    onEachFeature: onEachFeature,

    // Point to layer used to alter markers
    pointToLayer: function(feature, coord) {

      // Determine the style of markers based on properties
      let markers = {
        color: "black",
        fillColor: markerColour(feature.geometry.coordinates[2]),
        fillOpacity: 0.8,
        radius: markerSize(feature.properties.mag),
        stroke: true,
        weight: 0.5
      }
      return L.circle(coord,markers);
    }
  });

  // Send our earthquakes layer to the createMap function
  createMap(earthquakes);
}


// Create map function
function createMap(earthquakes) {
    // Create the base layers.
    let streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // https://stackoverflow.com/questions/9394190/leaflet-map-api-with-google-satellite-layer 
    let googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
      maxZoom: 20,
      subdomains:['mt0','mt1','mt2','mt3']
    });

    // https://stackoverflow.com/questions/9394190/leaflet-map-api-with-google-satellite-layer 
    let googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
      maxZoom: 20,
      subdomains:['mt0','mt1','mt2','mt3']
      });

    let grayscale = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    });
    
      // Create a baseMaps object to contain the streetmap and the darkmap.
    let baseMaps = {
        "Street": streetLayer,
        "Satellite": googleSatellite,
        "Terrain": googleTerrain,
        "Grayscale": grayscale
    };


    // Create layer for tectonic plates
    tectonicPlates = new L.layerGroup();

     // Perform a GET request to the tectonicplatesurl
     d3.json(tectonicplatesurl).then(function (plates) {

      // Console log the data retrieved 
      console.log(plates);
      L.geoJSON(plates, {
          color: "orange",
          weight: 2
      }).addTo(tectonicPlates);
    });

    // Create overlay object to hold our overlay layer	
    let overlayMaps = {
        "Earthquakes": earthquakes,
        "Tectonic Plates": tectonicPlates
    };


    // Modify the map with appropriate layers
    let myMap = L.map("map", {
        center: [
            29.749907, -95.358421
        ],
        zoom: 5,
        layers: [streetLayer, googleSatellite, googleTerrain, grayscale, earthquakes, tectonicPlates]
    });


    // Create a legend -  https://gis.stackexchange.com/questions/133630/adding-leaflet-legend 
    let getColor = ["limegreen", "greenyellow", "yellow", "orange", "orangered", "red"];

    let legend = L.control({position: 'bottomright'});
        legend.onAdd = function () {

    let div = L.DomUtil.create('div', 'info legend');
    let labels = ["<strong>Depth (km)</strong>"];
    let categories = ['-10-10', '10-30', '30-50', '50-70', '70-90', '90+'];

    for (let i = 0; i < categories.length; i++) {
            div.innerHTML += 
            labels.push(
                        '<li class="circle" style="background-color:' + getColor[i] + '">' + categories[i] + '</li> '
                    );
            }
            div.innerHTML = '<ul style="list-style-type:none; text-align: center">' + labels.join('') + '</ul>'
            return div;
        };
    legend.addTo(myMap);

    
    // Adding a scale to a map
    L.control.scale()
        .addTo(myMap);

    // Create a layer control that contains our baseMaps and overlayMaps, and add them to the map.
    L.control.layers(baseMaps, overlayMaps, {
        collapsed: true
        }).addTo(myMap);    
}