from app.routes.cards import allowed_cefr_levels


def test_allowed_cefr_levels_caps_content_to_current_path_phase():
    assert allowed_cefr_levels("A1") == ("A1",)
    assert allowed_cefr_levels("A2") == ("A1", "A2")
    assert allowed_cefr_levels("B1") == ("A1", "A2", "B1")
    assert allowed_cefr_levels("B2") == ("A1", "A2", "B1", "B2")


def test_allowed_cefr_levels_ignores_unknown_caps():
    assert allowed_cefr_levels(None) is None
    assert allowed_cefr_levels("C1") is None

