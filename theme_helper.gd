extends Node

static func apply_custom_styling(node: Control) -> void:
	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color("#161b22")
	panel_style.border_width_left = 1
	panel_style.border_width_top = 1
	panel_style.border_width_right = 1
	panel_style.border_width_bottom = 1
	panel_style.border_color = Color("#30363d")
	panel_style.set_corner_radius_all(6)
	panel_style.set_content_margin_all(12)

	node.add_theme_stylebox_override("panel", panel_style)
