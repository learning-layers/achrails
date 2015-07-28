class User < ActiveRecord::Base
  devise :rememberable, :omniauthable,
    omniauth_providers: if Rails.env.production?
                          [:learning_layers_oidc]
                        else
                          [:developer]
                        end

  has_many :memberships
  has_many :groups, through: :memberships, source: :group
  has_many :videos, through: :groups

  has_many :authored_videos, class_name: "Video", foreign_key: :author_id

  validates :name, presence: true

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create.update({
      email: auth.info.email,
      name: auth.info.name
    })
  end

end
