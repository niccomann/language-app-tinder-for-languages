from app.database.user_models import UserEntity


def test_user_entity_defaults():
    user = UserEntity(user_id="abc-123", display_name="Niccolo")
    assert user.user_id == "abc-123"
    assert user.display_name == "Niccolo"
    assert user.age is None
    assert user.target_language == "de"
    assert user.proficiency_level == "beginner"
    assert user.daily_goal_minutes == 10
    assert user.onboarding_completed is False


def test_user_entity_full_payload():
    user = UserEntity(
        user_id="abc-123",
        display_name="Niccolo",
        age=31,
        target_language="de",
        proficiency_level="b1_b2",
        daily_goal_minutes=15,
        onboarding_completed=True,
    )
    assert user.age == 31
    assert user.proficiency_level == "b1_b2"
    assert user.daily_goal_minutes == 15
    assert user.onboarding_completed is True
