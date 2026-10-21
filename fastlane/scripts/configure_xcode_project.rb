# Edits the generated ios/App/App.xcodeproj for TinyNudge. Idempotent.
# Run from the repo root:  bundle exec ruby fastlane/scripts/configure_xcode_project.rb
# (the xcodeproj gem comes with fastlane).
#
# - adds GoogleService-Info.plist and PrivacyInfo.xcprivacy to the app bundle
# - wires App.entitlements (Push Notifications + Sign in with Apple)
# - iPhone-only build (no iPad screenshots / iPad multitasking requirements)

require "xcodeproj"

ROOT = File.expand_path("../..", __dir__)
PROJECT_PATH = File.join(ROOT, "ios", "App", "App.xcodeproj")

abort("configure_xcode_project: #{PROJECT_PATH} not found (run `npx cap add ios` first)") unless File.directory?(PROJECT_PATH)

project = Xcodeproj::Project.open(PROJECT_PATH)
target = project.targets.find { |t| t.name == "App" }
abort("configure_xcode_project: target 'App' not found") unless target

group = project.main_group.children.find { |c| c.respond_to?(:path) && c.path == "App" && c.isa == "PBXGroup" }
abort("configure_xcode_project: group 'App' not found") unless group

def file_ref(group, name)
  group.files.find { |f| f.path == name } || group.new_reference(name)
end

%w[GoogleService-Info.plist PrivacyInfo.xcprivacy].each do |name|
  abort("configure_xcode_project: ios/App/App/#{name} is missing") unless File.exist?(File.join(ROOT, "ios", "App", "App", name))
  ref = file_ref(group, name)
  unless target.resources_build_phase.files_references.include?(ref)
    target.resources_build_phase.add_file_reference(ref, true)
    puts "Added #{name} to Copy Bundle Resources"
  end
end

file_ref(group, "App.entitlements")

target.build_configurations.each do |config|
  config.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements"
  config.build_settings["TARGETED_DEVICE_FAMILY"] = "1"
end

project.save
puts "Configured #{PROJECT_PATH}"
