CREATE OR REPLACE FUNCTION distribute_dividends(room_id UUID)
RETURNS json AS $$
DECLARE
    total_payments integer;
    total_amount integer;
BEGIN
    WITH dividend_updates AS (
        UPDATE players p
        SET cash = p.cash + dc.dividend_amount
        FROM (
            SELECT 
                ps.player_id,
                SUM(ps.quantity * s.dividend_amount)::integer as dividend_amount
            FROM player_stocks ps
            INNER JOIN stocks s ON s.id = ps.stock_id
            WHERE ps.room_id = $1 AND ps.quantity > 0
            GROUP BY ps.player_id
        ) dc
        WHERE p.id = dc.player_id
        RETURNING dc.dividend_amount
    )
    SELECT 
        COUNT(*)::integer,
        COALESCE(SUM(dividend_amount), 0)::integer
    INTO total_payments, total_amount
    FROM dividend_updates;

    RETURN json_build_object(
        'total_payments', total_payments,
        'total_amount', total_amount
    );
END;
$$ LANGUAGE plpgsql; 