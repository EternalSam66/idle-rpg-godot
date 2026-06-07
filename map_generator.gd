extends RefCounted


func generate_monster_stats(floor_level: int, is_boss: bool, active_party_size: int) -> Dictionary:

    var is_gate_floor: bool = (floor_level % 5 == 0)

    var gate_modifier: float = 1.65 if is_gate_floor else 1.0

    

    if is_boss:

        gate_modifier *= 1.3 if not is_gate_floor else 1.21


    var party_scaler: float = 1.0 + (active_party_size - 1) * 0.70


    return {

        "hp": roundi(50 * pow(1.32, floor_level - 1) * gate_modifier * party_scaler),

        "atk": roundi(8 * pow(1.26, floor_level - 1) * gate_modifier * party_scaler),

        "def": floori(floori((floor_level - 1) * 1.5) * gate_modifier),

        "spd": 2 + floori(floor_level * 0.1)

    }


func get_gold_revenue_per_run(floor_level: int) -> int:

    return roundi(15 * pow(1.42, floor_level - 1))
