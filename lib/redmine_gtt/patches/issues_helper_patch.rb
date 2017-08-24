module RedmineGtt
  module Patches

    module IssuesHelperPatch
      def self.included(base)
        base.extend(ClassMethods)
        base.send(:include, InstanceMethods)
        base.class_eval do
          unloadable
        end
      end

      module ClassMethods
        def get_geojson(issues)
          unless issues.nil?
            factory = RGeo::GeoJSON::EntityFactory.instance
            if (issues.kind_of?(Array))
              # Handle arrays of issues
              features = []
              issues.each do |issue|
                unless issue.geom.nil?
                  wkb = RGeo::WKRep::WKBParser.new().parse(issue.geom)
                  features << factory.feature(wkb, issue.id, issue.as_json)
                end
              end
              RGeo::GeoJSON.encode factory.feature_collection(features)
            else
              # Handle single issue
              wkb = RGeo::WKRep::WKBParser.new().parse(issues.geom)
              RGeo::GeoJSON.encode factory.feature(wkb, issue.id, issue.as_json)
            end
          else
            nil
          end
        end
      end

      module InstanceMethods
      end

    end
  end
end

unless IssuesHelper.included_modules.include?(RedmineGtt::Patches::IssuesHelperPatch)
  IssuesHelper.send(:include, RedmineGtt::Patches::IssuesHelperPatch)
end
