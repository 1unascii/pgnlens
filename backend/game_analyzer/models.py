from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Game(models.Model):
    event = models.CharField(max_length=50)
    site = models.CharField(max_length=50)
    date = models.DateField()
    round = models.IntegerField(null=True, blank=True) # null if round is unknown (PGN uses "-" or "?")
    white_player = models.CharField(max_length=50) # e.g. "Magnus Carlsen"
    black_player = models.CharField(max_length=50) # e.g. "Hikaru Nakamura"
    result = models.CharField(max_length=10) # e.g. "1-0", "0-1", "1/2-1/2", "*"
    white_elo = models.IntegerField(null=True, blank=True) # null if ELO is unknown
    black_elo = models.IntegerField(null=True, blank=True) # null if ELO is unknown
    time_control = models.CharField(max_length=25) # e.g. "10+0" or "30/15"
    end_time = models.TimeField(null=True, blank=True)  
    termination = models.CharField(max_length=50) # e.g. "Time forfeit", "Draw by agreement", "Resignation"
    eco_code = models.CharField(max_length=10, blank=True) # e.g. "B90"
    fen_matches_array = models.JSONField(default=list, blank=True) # e.g. ["King's Pawn Game", "Sicilian Defense", "Sicilian Defense: Najdorf Variation"]
    opening_line = models.CharField(max_length=200, blank=True) # e.g. "King's Pawn Game: Sicilian Defense: Najdorf Variation"
    opening_family = models.CharField(max_length=200, blank=True) # e.g. "Sicilian Defense"
    
    def __str__(self):
        return f"{self.white_player} vs {self.black_player} on {self.date}"

class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves')
    move_number = models.IntegerField()          # Which move (1, 2, 3...)
    white_move = models.CharField(max_length=10) # White's move in UCI notation (e.g. "e2e4")
    black_move = models.CharField(max_length=10, blank=True)  # Black's move (blank if game ended on white's move)
    evaluation = models.FloatField(null=True)    # Stockfish score (added later during analysis)
    is_blunder = models.BooleanField(default=False)  # Flagged during analysis
    is_mistake = models.BooleanField(default=False)  # Flagged during analysis
    is_good_move = models.BooleanField(default=False)  # Flagged during analysis
    is_brilliant_move = models.BooleanField(default=False)  # Flagged during analysis
    is_excellent_move = models.BooleanField(default=False)  # Flagged during analysis
    is_superb_move = models.BooleanField(default=False)  # Flagged during analysis
    is_perfect_move = models.BooleanField(default=False)  # Flagged during analysis
    is_terrible_move = models.BooleanField(default=False)  # Flagged during analysis
    is_horrible_move = models.BooleanField(default=False)  # Flagged during analysis

    def __str__(self):
        return f"Game {self.game.id} - Move {self.move_number}"

class Report(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    games = models.ManyToManyField(Game, related_name='reports', blank=True)

    def __str__(self):
        return self.name