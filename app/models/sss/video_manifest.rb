if SSS
class VideoManifest < ActiveRecord::Base

  def update_revision!
    revision = (revision || 0) + 1;
  end

  def read_manifest
    manifest_json
  end

  def to_param
    uuid
  end
end
end