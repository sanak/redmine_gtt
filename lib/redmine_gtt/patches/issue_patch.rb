require 'rgeo'
require 'rgeo/geo_json'
require_dependency 'issue'

module RedmineGtt
  module Patches

    module IssuePatch
      def self.included(base)
        base.extend(ClassMethods)
        base.send(:include, InstanceMethods)
        base.class_eval do
          unloadable
          safe_attributes "geom" if lambda {|issue, user| user.allowed_to?(:edit_issues, issue.project)}
        end
      end

      module ClassMethods
        def get_geojson(geom)
          unless geom.nil?
            wkb = RGeo::WKRep::WKBParser.new(
              :support_ewkb => true,
              :default_srid => 4326
            ).parse(geom)

            # TODO: maybe we can add feature properties here
            factory = RGeo::GeoJSON::EntityFactory.instance
            feature = factory.feature(wkb, nil, {})
            RGeo::GeoJSON.encode feature
          else
            nil
          end
        end
      end

      module InstanceMethods
        def geom=(g)
          # Turn geometry attribute into WKB for database use
          if (g.present?)
            geojson = JSON.parse(g)
            feature = RGeo::GeoJSON.decode(geojson, json_parser: :json)

            ewkb = RGeo::WKRep::WKBGenerator.new(
              :type_format => :ewkb,
              :emit_ewkb_srid => true,
              :hex_format => true
            )
            self[:geom] = ewkb.generate(feature.geometry)
          else
            self[:geom] = nil
          end
        end
      end

    end
  end
end

unless Issue.included_modules.include?(RedmineGtt::Patches::IssuePatch)
  Issue.send(:include, RedmineGtt::Patches::IssuePatch)
end