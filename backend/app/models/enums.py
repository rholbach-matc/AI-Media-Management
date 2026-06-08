from enum import Enum


class NodeType(str, Enum):
    BASE_IMAGE = "base_image"
    EDIT = "edit"
    ANIMATION = "animation"


class ModerationOutcome(str, Enum):
    PASSED = "passed"
    BLOCKED = "blocked"
    NOT_APPLICABLE = "not_applicable"


class GenerationMode(str, Enum):
    SPEED = "speed"
    QUALITY = "quality"


class PromptType(str, Enum):
    BASE = "base"
    EDIT = "edit"
    EXTENSION = "extension"


class TagCategory(str, Enum):
    TECHNIQUE = "technique"
    CONTENT_TYPE = "content_type"
    CHARACTER = "character"
    SETTING = "setting"
    MOOD = "mood"
    CUSTOM = "custom"


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


def enum_values(enum_cls: type[Enum]) -> list[str]:
    return [member.value for member in enum_cls]
