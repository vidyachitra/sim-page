# Local preview only. GitHub Pages ignores this file, but the github-pages gem
# pins the exact Jekyll and plugin versions GitHub uses, so what you see at
# localhost:4000 is what gets deployed. remote_theme in _config.yml pulls the theme.
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins

# Jekyll 3 on Ruby 3 needs these explicitly.
gem "webrick"
gem "faraday-retry"

# Windows: timezone data and a native file watcher.
platforms :windows do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
  gem "wdm", ">= 0.1.0"
end
