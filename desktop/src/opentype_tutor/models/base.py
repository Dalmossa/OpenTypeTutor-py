from pydantic import BaseModel, ConfigDict


def to_camel(field_name: str) -> str:
    head, *rest = field_name.split("_")
    return head + "".join(part.capitalize() for part in rest)


class BaseAPIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )