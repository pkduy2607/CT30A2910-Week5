const fetchMapData = async () => {
    const url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326";

    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    return data;
};

const fetchMigrationData = async () => {
    const url = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/muutl/11a2.px";
    const content = await fetch("json/migration_data_query_2026.json");
    const content_json = await content.json();
    console.log(content_json);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(content_json)
    });

    const data = await response.json();
    console.log(data);
    return data;
}

const getStyle = (migration_data) => {
    return (feature) => {
        const kuntaCode = "KU" + (feature.properties.kunta || feature.properties.id);
        
        const areaIndices = migration_data.dimension["alue_23_20260101"].category.index;
        const areaIndex = areaIndices[kuntaCode];
        
        if (areaIndex === undefined) return;

        const positive = migration_data.value[areaIndex * 2];
        const negative = migration_data.value[areaIndex * 2 + 1];
        
        const hue = Math.min((positive / negative) ** 3 * 60, 120);
        const hsl_color = `hsl(${hue}, 75%, 50%)`;
        
        return {
            weight: 2,
            color: hsl_color,
            fillColor: hsl_color,
            fillOpacity: 0.5,
        };
    };
};

const createMap = async () => {
    const [map_data, migration_data] = await Promise.all([fetchMapData(), fetchMigrationData()]);

    let map = L.map('map', {
        minZoom: -3
    });

    let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    let geoJson = L.geoJSON(map_data, {
        onEachFeature: createFeatureHandler(migration_data),
        style: getStyle(migration_data)
    }).addTo(map);

    map.fitBounds(geoJson.getBounds());
}

const createFeatureHandler = (migration_data) => {
    return (feature, layer) => {
        const kuntaCode = "KU" + (feature.properties.kunta || feature.properties.id);
        const areaIndices = migration_data.dimension["alue_23_20260101"].category.index;
        const areaIndex = areaIndices[kuntaCode];
        
        if (areaIndex === undefined) 
            return;

        const positive = migration_data.value[areaIndex * 2];
        const negative = migration_data.value[areaIndex * 2 + 1];
        
        const name = feature.properties.nimi || feature.properties.name || kuntaCode;
        layer.bindTooltip(feature.properties.name);
        layer.bindPopup(
            `<ul>
                <li>Name: ${name}</li>
                <li>Positive migration: ${positive}</li>
                <li>Negative migration: ${negative}</li>
            </ul>`
        );
    }
};

createMap();