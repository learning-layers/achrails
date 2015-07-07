class Group < ActiveRecord::Base

  has_many :memberships
  has_many :members, through: :memberships, source: :user
  has_and_belongs_to_many :videos

  validates :name, presence: true
  enum visibility: [:invite_only, :unlisted, :listed]

  def public_show?
    unlisted? || listed?
  end

  def join(user)
    memberships.where(user: user).first_or_create if user
  end

  def leave(user)
    memberships.where(user: user).destroy_all if user
  end

  def membership_for(user)
    memberships.find_by(user: user) if user
  end

  def member?(user)
    !membership_for(user).nil?
  end

  def admin?(user)
    membership_for(user).try(:admin?)
  end

end
