# Local preview only. GitHub Pages ignores this file and builds with its own
# environment (Jekyll + jekyll-remote-theme reading _config.yml).
source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "jekyll-remote-theme"
gem "just-the-docs", "0.10.0"   # keep in sync with remote_theme in _config.yml

# Windows: timezone data and no polling watcher
platforms :windows do
  gem "tzinfo", "~> 2.0"
  gem "tzinfo-data"
  gem "wdm", ">= 0.1.0"
end
