from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    # podatci profila korisnika

    id: str
    email: str
    name: str
    role: str
    display_name: str | None = None
    phone: str | None = None
    city: str | None = None
    bio: str | None = None
    avatar_key: str | None = None

    model_config = ConfigDict(from_attributes=True)
