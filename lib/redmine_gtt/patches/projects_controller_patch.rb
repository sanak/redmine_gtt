module RedmineGtt
  module Patches

    module ProjectsControllerPatch
      def self.apply
        ProjectsController.prepend self unless ProjectsController < self
      end

      def show
        respond_to do |format|
          format.geojson { send_data(
            @project.as_geojson(include_properties: true).to_json,
            type: 'application/json; header=present',
            filename: "#{@project.identifier}.geojson")
          }
          format.any { super }
        end
      end

      def update_gtt_configuration
        if request.put? and User.current.allowed_to?(:manage_gtt_settings, @project)
          @form = GttConfiguration.from_params(params[:gtt_configuration])
          @form.project = @project

          if @form.valid?

            r = RedmineGtt::Actions::UpdateProjectSettings.( @form )
            if r.settings_saved?
              flash.now[:notice] = l(:notice_successful_update)
            else
              flash.now[:error] = r.error
            end

          end
          settings
          params[:tab] = 'gtt'
          render action: 'settings'
        else
          redirect_to project_settings_path(@project, tab: 'gtt')
        end
      end

    end
  end
end

