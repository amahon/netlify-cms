import React from 'react';
import PropTypes from 'prop-types';
import { ClassNames } from '@emotion/core';
import olStyles from 'ol/ol.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoJSON from 'ol/format/GeoJSON';
import Draw from 'ol/interaction/Draw.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSMSource from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';

const formatOptions = {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
};
const getDefaultFormat = () => new GeoJSON(formatOptions);

const getDefaultMap = (target, featuresLayer) =>
  new Map({
    target,
    layers: [new TileLayer({ source: new OSMSource() }), featuresLayer],
    view: new View({ center: [0, 0], zoom: 2 }),
  });

export default function withMapControl({ getFormat, getMap } = {}) {
  return class MapControl extends React.Component {
    static propTypes = {
      onChange: PropTypes.func.isRequired,
      field: PropTypes.object.isRequired,
      value: PropTypes.node,
      parentCollapsed: PropTypes.bool,
    };

    static defaultProps = {
      value: '',
    };

    constructor(props) {
      super(props);
      this.mapContainer = React.createRef();
      this.map = null;
    }

    componentDidMount() {
      const { field, onChange, value, parentCollapsed } = this.props;
      const format = getFormat ? getFormat(field) : getDefaultFormat(field);
      const features = value ? [format.readFeature(value)] : [];

      const featuresSource = new VectorSource({ features, wrapX: false });
      const featuresLayer = new VectorLayer({ source: featuresSource });

      const target = this.mapContainer.current;
      this.map = getMap ? getMap(target, featuresLayer) : getDefaultMap(target, featuresLayer);
      if (features.length > 0) {
        this.map.getView().fit(featuresSource.getExtent(), { maxZoom: 16, padding: [80, 80, 80, 80] });
      }

      const draw = new Draw({ source: featuresSource, type: field.get('type', 'Point') });
      this.map.addInteraction(draw);

      const writeOptions = { decimals: field.get('decimals', 7) };
      draw.on('drawend', ({ feature }) => {
        featuresSource.clear();
        onChange(format.writeGeometry(feature.getGeometry(), writeOptions));
      });
    }

    shouldComponentUpdate(nextProps, nextState) {
      console.log(nextProps);
      if(nextProps.parentCollapsed != this.props.parentCollapsed) {
        return true;
      }
      return false;
    }

    componentDidUpdate(prevProps) {
      if(this.props.parentCollapsed == false && prevProps.parentCollapsed == true) {
        this.map.updateSize();
      }
    }

    render() {
      console.log('MAP - render');
      return (
        <ClassNames>
          {({ cx, css }) => (
            <div
              className={cx(
                this.props.classNameWrapper,
                css`
                  ${olStyles};
                  padding: 0;
                  overflow: hidden;
                  min-height: 400px;
                `,
              )}
              ref={this.mapContainer}
            />
          )}
        </ClassNames>
      );
    }
  };
}
