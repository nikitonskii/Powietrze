require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name            = "react-native-widget-sync"
  s.version         = package["version"]
  s.summary         = package["description"]
  s.homepage        = "https://github.com/nikitonskii/Powietrze"
  s.license         = "MIT"
  s.authors         = "Powietrze"
  s.platforms       = { :ios => "15.1" }
  s.source          = { :git => "https://github.com/nikitonskii/Powietrze.git", :tag => "#{s.version}" }

  s.source_files    = "ios/**/*.{h,m,mm,swift}"

  # Wires React-Core + New-Architecture (codegen output, folly flags) automatically.
  install_modules_dependencies(s)
end
