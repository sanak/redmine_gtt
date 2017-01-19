/**
 * [description]
 * @param  {[type]} $     [description]
 * @param  {[type]} publ  [description]
 * @return {[type]}       [description]
 */
App.map = (function ($, publ) {

  var map, vector, bounds, contents, toolbar, geolocation = null;
  var features = [];

  // Quick hack
  var quick_hack = {
    lon: 135.1955,
    lat: 34.6901,
    zoom: 13,
    maxzoom: 18
  };

  /**
   *
   */
  publ.init = function (options) {

    contents = $(options.target).data();
    defaults = $("#ol-defaults").data();

    if (defaults.lon === null) defaults.lon = quick_hack.lon
    if (defaults.lat === null) defaults.lat = quick_hack.lat
    if (defaults.zoom === null) defaults.zoom = quick_hack.zoom
    if (defaults.maxzoom === null) defaults.maxzoom = quick_hack.maxzoom

    if (contents.geom && contents.geom !== null) {
      features = new ol.format.GeoJSON().readFeatures(
        contents.geom, {
          featureProjection: 'EPSG:3857'
        }
      );
    }

    // TODO: this is only necessary because setting the initial form value
    //  through the template causes encoding problems
    publ.updateForm(features);

    // Layer for vector features
    vector = new ol.layer.Vector({
      source: new ol.source.Vector({
        "features": features,
        "useSpatialIndex": false
      }),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 4
        }),
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: '#ffcc33'
          })
        })
      })
    });

    // Layer for project boundary
    bounds = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#29a2e1',
          width: 4
        })
      })
    });

    var tiles = new ol.layer.Tile({
      // source: new ol.source.OSM({
      //   url: "https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png",
      //   attributions: "Maptiles by <a href='http://mierune.co.jp/' " +
      //     "target='_blank'>MIERUNE</a>, under CC BY. Data by <a " +
      //     "href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> " +
      //     "contributors, under ODbL.",
      //   crossOrigin: null
      // })
      source: new ol.source.OSM({
        url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
        attributions: '<a href="https://portal.cyberjapan.jp/help/termsofuse.html" target="_blank">国土地理院</a>',
        crossOrigin: null
      })
    });

    // Render project boundary if bounds are available
    if (contents.bounds && contents.bounds !== null) {

      var boundary = new ol.format.GeoJSON().readFeature(
        contents.bounds, {
          featureProjection: 'EPSG:3857'
        }
      );
      bounds.getSource().addFeature(boundary);

      tiles.addFilter(
        new ol.filter.Mask({
          feature: boundary,
          inner: false,
          fill: new ol.style.Fill({ color:[255,255,255,0.8] })
        })
      );
    }

    map = new ol.Map({
      target: options.target,
      layers: [tiles,bounds,vector],
      controls: ol.control.defaults({
        attributionOptions: ({
          collapsible: false
        })
      })
    });

    // Add Toolbar
    toolbar = new ol.control.Bar();
    toolbar.setPosition("bottom-left");
    map.addControl(toolbar);

    this.setView();
    this.setGeolocation();
    this.setGeocoding();
    this.zoomToExtent();

    // Control button
    var maximizeCtrl = new ol.control.Button({
      html: '<i class="icon-maximize" ></i>',
      title: "Maximize",
      handleClick: function () {
        publ.zoomToExtent();
      }
    });
    toolbar.addControl(maximizeCtrl);

    if (contents.edit) {
      this.setControls(contents.edit.split(' '));
    }
    else if (contents.popup) {
      this.setPopover();
    }

    // When one or more issues is selected, zoom to selected map features
    $("table.issues tbody tr").on('click', function (evt) {
      var id = $(this).attr("id").split('-')[1];
      var feature = vector.getSource().getFeatureById(id);
      map.getView().fit(feature.getGeometry(), map.getSize());
    });

    // Need to update size of an invisible map, when the editable form is made
    // visible. This doesn't look like a good way to do it, but this is more of
    // a Redmine problem
    $("div.contextual a.icon-edit").on('click', function (evt) {
      setTimeout( function() {
        map.updateSize();
      }, 200);
    });

    return;
  };

  /**
   *
   */
  publ.setView = function () {

    var view = new ol.View({
      center: ol.proj.fromLonLat([defaults.lon, defaults.lat]),
      zoom: defaults.zoom,
      maxZoom: defaults.maxzoom // applies for Mierune Tiles
    });

    map.setView(view);
  };

  /**
   *
   */
  publ.zoomToExtent = function () {
    if (vector.getSource().getFeatures().length > 0) {
      var extent = ol.extent.createEmpty();
      // Because the vector layer is set to "useSpatialIndex": false, we cannot
      // make use of "vector.getSource().getExtent()"
      vector.getSource().getFeatures().forEach(function (feature) {
        ol.extent.extend(extent, feature.getGeometry().getExtent());
      });
      map.getView().fit(extent, map.getSize());
    }
    else if (bounds.getSource().getFeatures().length > 0) {
      map.getView().fit(bounds.getSource().getExtent(), map.getSize());
    }
    else if (geolocation) {
      geolocation.once('change:position', function (error) {
        map.getView().setCenter(geolocation.getPosition());
      });
    }
  };

  /**
   * Add Geolocation functionality
   */
  publ.setGeolocation = function (){

    geolocation = new ol.Geolocation({
      tracking: false,
      projection: map.getView().getProjection()
    });

    geolocation.on('change', function() {
      // console.log({
      //   accuracy: geolocation.getAccuracy(),
      //   altitude: geolocation.getAltitude(),
      //   altitudeAccuracy: geolocation.getAltitudeAccuracy(),
      //   heading: geolocation.getHeading(),
      //   speed: geolocation.getSpeed()
      // });
    });

    geolocation.on('error', function (error) {
      // TBD
    });

    var accuracyFeature = new ol.Feature();
    geolocation.on('change:accuracyGeometry', function (error) {
      accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    });

    var positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
          color: '#3399CC'
        }),
        stroke: new ol.style.Stroke({
          color: '#fff',
          width: 2
        })
      })
    }));

    geolocation.on('change:position', function (error) {
      var position = geolocation.getPosition();
      positionFeature.setGeometry(position ? new ol.geom.Point(position) : null);
    });

    var geolocationLayer = new ol.layer.Vector({
      map: map,
      source: new ol.source.Vector({
        features: [accuracyFeature, positionFeature]
      })
    });
    map.addLayer(geolocationLayer);

    // Control button
    var geolocationCtrl = new ol.control.Toggle({
      html: '<i class="icon-compass" ></i>',
      title: "Geolocation",
      active: false,
      onToggle: function (active) {
        geolocation.setTracking(active);
        geolocationLayer.setVisible(active);
        if (active) {
          map.getView().setCenter(geolocation.getPosition());
        }
      }
    });
    toolbar.addControl(geolocationCtrl);
  };

  /**
   * Add Geocoding functionality
   */
  publ.setGeocoding = function (){

    // Control button
    var geocodingCtrl = new ol.control.Toggle({
      html: '<i class="icon-info" ></i>',
      title: "Geocoding",
      onToggle: function (active) {
        console.log(active);
      },
      bar: new ol.control.Bar({
        controls: [
          new ol.control.Button({
            html: '<input type="text" placeholder="Go to address..." disabled />'
          })
        ]
      })
    });
    toolbar.addControl(geocodingCtrl);
  };

  /**
   *  Add editing tools
   */
  publ.setControls = function (types) {

    // Make vector features editable
    var modify = new ol.interaction.Modify({
      features: (vector.getSource()).getFeaturesCollection()
    });

    modify.on('modifyend', function(evt) {
      this.updateForm(evt.features.getArray());
    }, publ);

    map.addInteraction(modify);

    // Add Controlbar
    var mainbar = new ol.control.Bar();
    mainbar.setPosition("top-left");
    map.addControl(mainbar);

    var editbar = new ol.control.Bar({
      toggleOne: true,	// one control active at the same time
			group: true			  // group controls together
		});
		mainbar.addControl(editbar);

    types.forEach(function(type) {
      var draw = new ol.interaction.Draw({
        type: type,
        source: vector.getSource()
      });

      draw.on('drawend', function(evt) {
        (vector.getSource()).clear();
        publ.updateForm([evt.feature]);
      });

      var control = new ol.control.Toggle({
        html: '<i class="icon-' + type.toLowerCase() + '" ></i>',
        title: type,
        interaction: draw
      });
      editbar.addControl(control);
    });

    var controls = editbar.getControls();
    controls[0].setActive(true);
  };

  /**
   *
   */
  publ.setPopover = function () {

    var overlay = new ol.Overlay({
      element: document.getElementById('popup'),
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });
    map.addOverlay(overlay);

    $('#popup-closer').bind('click', function(evt) {
      publ.unsetPopover(overlay,this);
    });

    // display popup on click
    map.on('singleclick', function(evt) {
      var feature = map.forEachFeatureAtPixel(evt.pixel,
        function(feature, layer) {
          return feature;
        }, null, function (layer) {
          // Only return fatures from layer "vector"
          return layer === vector;
        }
      );

      if (feature) {
        // TODO: Localize the popup and make it look better
        var url = contents.popup.href.replace(/\[(.+?)\]/g, feature.get('id'))
        $('#popup-content').html('<a href="' + url + '">Edit</a>');
        overlay.setPosition(evt.coordinate);
      }
      else {
        publ.unsetPopover(overlay,$('#popup-closer'));
      }
    });

    // change mouse cursor when over marker
    map.on('pointermove', function(evt) {
      if (evt.dragging) return;
      var hit = map.hasFeatureAtPixel(evt.pixel, function(layer) {
        return layer === vector;
      });
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  };

  publ.unsetPopover = function (layer,close) {
    layer.setPosition(undefined);
    close.blur();
    return false;
  };

  /**
   *
   */
  publ.updateForm = function (features) {
    var writer = new ol.format.GeoJSON();
    var geojson = JSON.parse(writer.writeFeatures(features, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    }));
    $("#geom").val(JSON.stringify(geojson.features[0]));
  };

  /**
   * Return public objects
   */
  return publ;

})(jQuery, App.map || {});
