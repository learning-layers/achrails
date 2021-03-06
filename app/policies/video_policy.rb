class VideoPolicy < Struct.new(:user, :video)
  class Scope < Struct.new(:user, :scope)
    def resolve
      # We can avoid using this if we never want to list _all_ the videos
      # directly, better just to enumerate the groups probably.
      # TODO: Implement if needed
      scope
    end
  end

  def index?
    # These will be filtered by Scope
    true
  end

  def show?
    # Video author can see unconditionally
    return true if video.author?(user)

    # Public videos are visible
    return true if video.is_public

    # Other people if it has been shared into a group they can see
    # NOTE: This might be slow, SQL optimize if needed
    video.groups.each do |group|
      return true if group.listed? || group.member?(user)
    end

    false
  end

  def create?
    # Users can upload videos
    user.present?
  end

  def update?
    # All users can edit visible videos
    user.present? && show?
  end

  def edit?
    update?
  end

  def destroy?
    video.author?(user)
  end

  def share?
    video.author?(user)
  end

  def revert?
    video.author?(user)
  end

  def revisions?
    show?
  end

end

